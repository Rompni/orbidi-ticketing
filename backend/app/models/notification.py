import enum
from sqlalchemy import Enum, ForeignKey, JSON, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.models.base import Base, TimestampMixin


class NotificationType(str, enum.Enum):
    ASSIGNED = "assigned"
    COMMENTED = "commented"
    STATUS_CHANGED = "status_changed"


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "read_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type"), nullable=False
    )
    ticket_id: Mapped[int | None] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"))
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
