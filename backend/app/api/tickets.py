from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.ticket import TicketStatus, TicketPriority
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketOut, TicketList
from app.services import tickets as ticket_svc

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=TicketList)
async def list_tickets(
    status: TicketStatus | None = Query(None),
    priority: TicketPriority | None = Query(None),
    assignee_id: int | None = Query(None),
    author_id: int | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = await ticket_svc.list_tickets(
        db,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        author_id=author_id,
        offset=offset,
        limit=limit,
    )
    return TicketList(items=items, total=total)


@router.post("", response_model=TicketOut, status_code=201)
async def create_ticket(
    data: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ticket_svc.create_ticket(db, data, current_user)


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ticket_svc.get_ticket_or_404(db, ticket_id)


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ticket_svc.update_ticket(db, ticket_id, data, current_user)


@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ticket_svc.delete_ticket(db, ticket_id, current_user)
