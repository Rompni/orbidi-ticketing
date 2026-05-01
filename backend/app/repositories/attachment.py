from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.attachment import Attachment


async def get_by_id(db: AsyncSession, attachment_id: int) -> Attachment | None:
    result = await db.execute(
        select(Attachment)
        .options(selectinload(Attachment.uploader))
        .where(Attachment.id == attachment_id)
    )
    return result.scalar_one_or_none()


async def list_by_ticket(db: AsyncSession, ticket_id: int) -> list[Attachment]:
    result = await db.execute(
        select(Attachment)
        .options(selectinload(Attachment.uploader))
        .where(Attachment.ticket_id == ticket_id)
        .order_by(Attachment.created_at.asc())
    )
    return list(result.scalars().all())


async def create(db: AsyncSession, **kwargs) -> Attachment:
    attachment = Attachment(**kwargs)
    db.add(attachment)
    await db.flush()
    return attachment


async def delete(db: AsyncSession, attachment: Attachment) -> None:
    await db.delete(attachment)
    await db.flush()
