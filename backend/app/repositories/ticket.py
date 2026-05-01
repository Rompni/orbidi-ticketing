from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.ticket import Ticket, TicketStatus, TicketPriority


async def get_by_id(db: AsyncSession, ticket_id: int) -> Ticket | None:
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.author), selectinload(Ticket.assignee))
        .where(Ticket.id == ticket_id)
    )
    return result.scalar_one_or_none()


async def list_tickets(
    db: AsyncSession,
    *,
    status: TicketStatus | None = None,
    priority: TicketPriority | None = None,
    assignee_id: int | None = None,
    author_id: int | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Ticket], int]:
    query = select(Ticket).options(selectinload(Ticket.author), selectinload(Ticket.assignee))
    count_query = select(func.count()).select_from(Ticket)

    if status:
        query = query.where(Ticket.status == status)
        count_query = count_query.where(Ticket.status == status)
    if priority:
        query = query.where(Ticket.priority == priority)
        count_query = count_query.where(Ticket.priority == priority)
    if assignee_id is not None:
        query = query.where(Ticket.assignee_id == assignee_id)
        count_query = count_query.where(Ticket.assignee_id == assignee_id)
    if author_id is not None:
        query = query.where(Ticket.author_id == author_id)
        count_query = count_query.where(Ticket.author_id == author_id)

    query = query.order_by(Ticket.created_at.desc()).offset(offset).limit(limit)

    items = (await db.execute(query)).scalars().all()
    total = (await db.execute(count_query)).scalar_one()
    return list(items), total


async def create(db: AsyncSession, **kwargs) -> Ticket:
    ticket = Ticket(**kwargs)
    db.add(ticket)
    await db.flush()
    await db.refresh(ticket, ["author", "assignee"])
    return ticket


async def update(db: AsyncSession, ticket: Ticket, **kwargs) -> Ticket:
    for key, value in kwargs.items():
        setattr(ticket, key, value)
    await db.flush()
    await db.refresh(ticket, ["author", "assignee"])
    return ticket


async def delete(db: AsyncSession, ticket: Ticket) -> None:
    await db.delete(ticket)
    await db.flush()
