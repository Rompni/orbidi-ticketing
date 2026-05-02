from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.comment import Comment
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.comment import CommentCreate
from app.repositories import comment as comment_repo
from app.services.tickets import get_ticket_or_404
from app.services import notifications as notif_svc


async def list_comments(db: AsyncSession, ticket_id: int) -> list[Comment]:
    await get_ticket_or_404(db, ticket_id)
    return await comment_repo.list_by_ticket(db, ticket_id)


async def create_comment(
    db: AsyncSession, ticket_id: int, data: CommentCreate, current_user: User
) -> Comment:
    ticket = await get_ticket_or_404(db, ticket_id)
    comment = await comment_repo.create(
        db,
        ticket_id=ticket_id,
        author_id=current_user.id,
        body=data.body,
    )
    await db.commit()
    comment = await comment_repo.get_by_id(db, comment.id)

    payload = {
        "ticket_title": ticket.title,
        "commenter": current_user.name,
        "preview": data.body[:100],
    }
    recipients: set[int] = {ticket.author_id, ticket.assignee_id} - {None, current_user.id}  # type: ignore[arg-type]
    for uid in recipients:
        await notif_svc.create_notification(
            db,
            user_id=uid,
            type=NotificationType.COMMENTED,
            ticket_id=ticket_id,
            payload=payload,
        )

    return comment


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
