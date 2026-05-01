import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.attachment import Attachment
from app.models.user import User
from app.repositories import attachment as attachment_repo
from app.services.tickets import get_ticket_or_404

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "text/plain", "text/csv",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


async def list_attachments(db: AsyncSession, ticket_id: int) -> list[Attachment]:
    await get_ticket_or_404(db, ticket_id)
    return await attachment_repo.list_by_ticket(db, ticket_id)


async def upload_attachment(
    db: AsyncSession, ticket_id: int, file: UploadFile, current_user: User
) -> Attachment:
    await get_ticket_or_404(db, ticket_id)

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Tipo de archivo no permitido: {file.content_type}")

    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"El archivo supera el límite de {settings.MAX_UPLOAD_MB} MB")

    upload_dir = Path(settings.UPLOAD_DIR) / str(ticket_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}_{file.filename}"
    stored_path = upload_dir / stored_name
    stored_path.write_bytes(contents)

    attachment = await attachment_repo.create(
        db,
        ticket_id=ticket_id,
        uploader_id=current_user.id,
        filename=file.filename,
        stored_path=str(stored_path),
        mime_type=file.content_type,
        size_bytes=len(contents),
    )
    await db.commit()
    return await attachment_repo.get_by_id(db, attachment.id)


async def get_attachment_or_404(
    db: AsyncSession, ticket_id: int, attachment_id: int
) -> Attachment:
    attachment = await attachment_repo.get_by_id(db, attachment_id)
    if not attachment or attachment.ticket_id != ticket_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")
    return attachment


async def delete_attachment(
    db: AsyncSession, ticket_id: int, attachment_id: int, current_user: User
) -> str:
    attachment = await get_attachment_or_404(db, ticket_id, attachment_id)
    if attachment.uploader_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your attachment")
    stored_path = attachment.stored_path
    await attachment_repo.delete(db, attachment)
    await db.commit()
    return stored_path
