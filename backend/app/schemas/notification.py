from datetime import datetime
from pydantic import BaseModel
from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: int
    type: NotificationType
    ticket_id: int | None
    payload: dict
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
