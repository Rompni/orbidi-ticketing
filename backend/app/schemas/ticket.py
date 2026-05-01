from datetime import datetime
from pydantic import BaseModel, Field
from app.models.ticket import TicketStatus, TicketPriority
from app.schemas.user import UserOut


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    priority: TicketPriority = TicketPriority.MEDIUM
    assignee_id: int | None = None


class TicketUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    assignee_id: int | None = None


class TicketOut(BaseModel):
    id: int
    title: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    author: UserOut
    assignee: UserOut | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketList(BaseModel):
    items: list[TicketOut]
    total: int
