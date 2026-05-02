import json
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.models.user import User
from app.models.ticket import TicketStatus, TicketPriority
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.schemas.comment import CommentCreate
from app.services import tickets as ticket_svc, comments as comment_svc
from app.repositories import user as user_repo

MODEL = "claude-haiku-4-5-20251001"

TOOLS: list[dict] = [
    {
        "name": "list_tickets",
        "description": "Lista los tickets del sistema. Permite filtrar por estado y prioridad.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["open", "in_progress", "in_review", "closed"],
                    "description": "Filtrar por estado",
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "urgent"],
                    "description": "Filtrar por prioridad",
                },
            },
        },
    },
    {
        "name": "get_ticket",
        "description": "Obtiene los detalles de un ticket por su ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id": {"type": "integer", "description": "ID del ticket"},
            },
            "required": ["ticket_id"],
        },
    },
    {
        "name": "create_ticket",
        "description": "Crea un nuevo ticket en el sistema.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Título del ticket"},
                "description": {"type": "string", "description": "Descripción detallada"},
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "urgent"],
                    "description": "Prioridad (default: medium)",
                },
            },
            "required": ["title"],
        },
    },
    {
        "name": "update_ticket_status",
        "description": "Cambia el estado de un ticket existente.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id": {"type": "integer", "description": "ID del ticket"},
                "status": {
                    "type": "string",
                    "enum": ["open", "in_progress", "in_review", "closed"],
                    "description": "Nuevo estado",
                },
            },
            "required": ["ticket_id", "status"],
        },
    },
    {
        "name": "add_comment",
        "description": "Agrega un comentario a un ticket.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id": {"type": "integer", "description": "ID del ticket"},
                "body": {"type": "string", "description": "Texto del comentario"},
            },
            "required": ["ticket_id", "body"],
        },
    },
    {
        "name": "reassign_ticket",
        "description": (
            "Reasigna un ticket a otro usuario. "
            "Usa list_users si no conoces el ID del usuario."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id": {"type": "integer", "description": "ID del ticket"},
                "assignee_id": {
                    "type": ["integer", "null"],
                    "description": "ID del usuario. null para desasignar.",
                },
            },
            "required": ["ticket_id"],
        },
    },
    {
        "name": "list_users",
        "description": "Lista todos los usuarios del sistema con sus IDs.",
        "input_schema": {"type": "object", "properties": {}},
    },
]


def _ticket_dict(ticket) -> dict:
    return {
        "id": ticket.id,
        "title": ticket.title,
        "status": ticket.status.value,
        "priority": ticket.priority.value,
        "author": ticket.author.name,
        "assignee": ticket.assignee.name if ticket.assignee else None,
    }


async def _run_tool(
    name: str, inp: dict, db: AsyncSession, current_user: User
) -> dict:
    try:
        if name == "list_tickets":
            status = TicketStatus(inp["status"]) if inp.get("status") else None
            priority = TicketPriority(inp["priority"]) if inp.get("priority") else None
            items, total = await ticket_svc.list_tickets(
                db, status=status, priority=priority
            )
            return {"total": total, "items": [_ticket_dict(t) for t in items]}

        if name == "get_ticket":
            ticket = await ticket_svc.get_ticket_or_404(db, inp["ticket_id"])
            return _ticket_dict(ticket)

        if name == "create_ticket":
            data = TicketCreate(
                title=inp["title"],
                description=inp.get("description", ""),
                priority=TicketPriority(inp["priority"]) if inp.get("priority") else TicketPriority.MEDIUM,
            )
            ticket = await ticket_svc.create_ticket(db, data, current_user)
            return _ticket_dict(ticket)

        if name == "update_ticket_status":
            data = TicketUpdate(status=TicketStatus(inp["status"]))
            ticket = await ticket_svc.update_ticket(db, inp["ticket_id"], data, current_user)
            return _ticket_dict(ticket)

        if name == "add_comment":
            data = CommentCreate(body=inp["body"])
            comment = await comment_svc.create_comment(db, inp["ticket_id"], data, current_user)
            return {"id": comment.id, "body": comment.body}

        if name == "reassign_ticket":
            data = TicketUpdate(assignee_id=inp.get("assignee_id"))
            ticket = await ticket_svc.update_ticket(db, inp["ticket_id"], data, current_user)
            return _ticket_dict(ticket)

        if name == "list_users":
            users = await user_repo.list_all(db)
            return {"users": [{"id": u.id, "name": u.name, "email": u.email} for u in users]}

        return {"error": f"Herramienta desconocida: {name}"}

    except HTTPException as e:
        return {"error": e.detail}
    except Exception as e:
        return {"error": str(e)}


async def run_chat(
    messages: list[dict],
    db: AsyncSession,
    current_user: User,
) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(503, "ANTHROPIC_API_KEY no configurada")

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    system = (
        f"Eres un asistente de gestión de tickets para Orbidi Ticketing. "
        f"El usuario autenticado es {current_user.name} (ID interno: {current_user.id}). "
        "Usa las herramientas disponibles para ayudar a gestionar tickets. "
        "Reglas de formato en tus respuestas: "
        "1) Refiere a los tickets siempre como '#N' (ejemplo: #12, no 'ticket 12' ni 'ID 12'). "
        "2) Nunca menciones IDs numéricos de usuarios; usa solo sus nombres. "
        "3) Sé conciso. Responde siempre en español."
    )

    api_messages: list[dict] = list(messages)
    tool_calls: list[dict] = []

    for _ in range(10):  # max 10 tool-use rounds
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system,
            tools=TOOLS,  # type: ignore[arg-type]
            messages=api_messages,  # type: ignore[arg-type]
        )

        if response.stop_reason == "end_turn":
            text = next(
                (b.text for b in response.content if b.type == "text"), ""
            )
            return {"response": text, "tool_calls": tool_calls}

        # Build assistant content blocks
        assistant_blocks = []
        tool_result_blocks = []

        for block in response.content:
            if block.type == "text":
                assistant_blocks.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                assistant_blocks.append(
                    {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
                )
                result = await _run_tool(block.name, block.input, db, current_user)
                tool_calls.append({"tool": block.name, "input": block.input, "result": result})
                tool_result_blocks.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False, default=str),
                    }
                )

        api_messages.append({"role": "assistant", "content": assistant_blocks})
        api_messages.append({"role": "user", "content": tool_result_blocks})

    return {"response": "Se alcanzó el límite de operaciones.", "tool_calls": tool_calls}
