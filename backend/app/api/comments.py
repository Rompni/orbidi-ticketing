from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentOut
from app.services import comments as comment_svc

router = APIRouter(prefix="/tickets/{ticket_id}/comments", tags=["comments"])


@router.get("", response_model=list[CommentOut])
async def list_comments(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await comment_svc.list_comments(db, ticket_id)


@router.post("", response_model=CommentOut, status_code=201)
async def create_comment(
    ticket_id: int,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await comment_svc.create_comment(db, ticket_id, data, current_user)


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    ticket_id: int,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await comment_svc.delete_comment(db, ticket_id, comment_id, current_user)
