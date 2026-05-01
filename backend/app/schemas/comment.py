from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.user import UserOut


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1)


class CommentOut(BaseModel):
    id: int
    ticket_id: int
    body: str
    author: UserOut
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
