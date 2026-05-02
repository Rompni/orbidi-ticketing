from datetime import datetime, timezone
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification, NotificationType


async def create(
    db: AsyncSession,
    *,
    user_id: int,
    type: NotificationType,
    ticket_id: int | None,
    payload: dict,
) -> Notification:
    notif = Notification(user_id=user_id, type=type, ticket_id=ticket_id, payload=payload)
    db.add(notif)
    await db.flush()
    return notif


async def list_for_user(db: AsyncSession, user_id: int, limit: int = 30) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def count_unread(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
    )
    return result.scalar_one()


async def mark_read(db: AsyncSession, notification_id: int, user_id: int) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user_id)
        .values(read_at=datetime.now(timezone.utc))
    )


async def mark_all_read(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(timezone.utc))
    )
