from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.repositories import ticket as ticket_repo


async def get_ticket_or_404(db: AsyncSession, ticket_id: int) -> Ticket:
    ticket = await ticket_repo.get_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return ticket


async def list_tickets(
    db: AsyncSession,
    *,
    status: TicketStatus | None = None,
    priority=None,
    assignee_id: int | None = None,
    author_id: int | None = None,
    offset: int = 0,
    limit: int = 50,
):
    return await ticket_repo.list_tickets(
        db,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        author_id=author_id,
        offset=offset,
        limit=limit,
    )


async def create_ticket(db: AsyncSession, data: TicketCreate, current_user: User) -> Ticket:
    ticket = await ticket_repo.create(
        db,
        title=data.title,
        description=data.description,
        priority=data.priority,
        assignee_id=data.assignee_id,
        author_id=current_user.id,
    )
    await db.commit()
    return await ticket_repo.get_by_id(db, ticket.id)


async def update_ticket(
    db: AsyncSession, ticket_id: int, data: TicketUpdate, current_user: User
) -> Ticket:
    ticket = await get_ticket_or_404(db, ticket_id)
    changes = data.model_dump(exclude_unset=True)
    if not changes:
        return ticket
    ticket = await ticket_repo.update(db, ticket, **changes)
    await db.commit()
    return await ticket_repo.get_by_id(db, ticket.id)


async def delete_ticket(db: AsyncSession, ticket_id: int, current_user: User) -> None:
    ticket = await get_ticket_or_404(db, ticket_id)
    await ticket_repo.delete(db, ticket)
    await db.commit()
