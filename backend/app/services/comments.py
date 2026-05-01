from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreate
from app.repositories import comment as comment_repo
from app.services.tickets import get_ticket_or_404


async def list_comments(db: AsyncSession, ticket_id: int) -> list[Comment]:
    await get_ticket_or_404(db, ticket_id)
    return await comment_repo.list_by_ticket(db, ticket_id)


async def create_comment(
    db: AsyncSession, ticket_id: int, data: CommentCreate, current_user: User
) -> Comment:
    await get_ticket_or_404(db, ticket_id)
    comment = await comment_repo.create(
        db,
        ticket_id=ticket_id,
        author_id=current_user.id,
        body=data.body,
    )
    await db.commit()
    return await comment_repo.get_by_id(db, comment.id)


async def delete_comment(
    db: AsyncSession, ticket_id: int, comment_id: int, current_user: User
) -> None:
    comment = await comment_repo.get_by_id(db, comment_id)
    if not comment or comment.ticket_id != ticket_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your comment")
    await comment_repo.delete(db, comment)
    await db.commit()
