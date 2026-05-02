from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserOut
from app.repositories import user as user_repo

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return await user_repo.list_all(db)
