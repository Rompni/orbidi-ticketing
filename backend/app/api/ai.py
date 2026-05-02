from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.ai import assistant

router = APIRouter(prefix="/ai", tags=["ai"])


class MessageIn(BaseModel):
    role: str
    content: str


class ToolCallOut(BaseModel):
    tool: str
    input: dict
    result: dict


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[ToolCallOut]


class ChatRequest(BaseModel):
    messages: list[MessageIn]


@router.get("/status")
async def ai_status(_: User = Depends(get_current_user)):
    from app.core.config import settings
    return {"available": bool(settings.ANTHROPIC_API_KEY)}


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    result = await assistant.run_chat(messages, db, current_user)
    return result
