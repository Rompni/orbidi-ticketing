from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserOut


class AttachmentOut(BaseModel):
    id: int
    ticket_id: int
    filename: str
    mime_type: str
    size_bytes: int
    uploader: UserOut
    created_at: datetime

    model_config = {"from_attributes": True}
