from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.attachment import AttachmentOut
from app.services import attachments as attachment_svc

router = APIRouter(prefix="/tickets/{ticket_id}/attachments", tags=["attachments"])


@router.get("", response_model=list[AttachmentOut])
async def list_attachments(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await attachment_svc.list_attachments(db, ticket_id)


@router.post("", response_model=AttachmentOut, status_code=201)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await attachment_svc.upload_attachment(db, ticket_id, file, current_user)


@router.get("/{attachment_id}/download")
async def download_attachment(
    ticket_id: int,
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = await attachment_svc.get_attachment_or_404(db, ticket_id, attachment_id)
    return FileResponse(
        path=attachment.stored_path,
        filename=attachment.filename,
        media_type=attachment.mime_type,
    )


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    ticket_id: int,
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stored_path = await attachment_svc.delete_attachment(db, ticket_id, attachment_id, current_user)
    Path(stored_path).unlink(missing_ok=True)
