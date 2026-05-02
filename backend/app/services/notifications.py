from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import NotificationType
from app.repositories import notification as notif_repo
from app.ws.broker import broker


async def create_notification(
    db: AsyncSession,
    *,
    user_id: int,
    type: NotificationType,
    ticket_id: int | None = None,
    payload: dict,
) -> None:
    notif = await notif_repo.create(
        db, user_id=user_id, type=type, ticket_id=ticket_id, payload=payload
    )
    await db.commit()
    await db.refresh(notif)

    await broker.publish(user_id, {
        "type": "notification",
        "id": notif.id,
        "notification_type": notif.type.value,
        "ticket_id": notif.ticket_id,
        "payload": notif.payload,
        "created_at": notif.created_at.isoformat(),
    })
