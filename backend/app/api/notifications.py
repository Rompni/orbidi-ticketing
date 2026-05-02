from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationOut
from app.repositories import notification as notif_repo

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await notif_repo.list_for_user(db, current_user.id)


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"count": await notif_repo.count_unread(db, current_user.id)}


@router.post("/{notification_id}/read", status_code=204)
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await notif_repo.mark_read(db, notification_id, current_user.id)
    await db.commit()


@router.post("/mark-all-read", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await notif_repo.mark_all_read(db, current_user.id)
    await db.commit()
