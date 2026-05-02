from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User


async def list_all(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.name))
    return list(result.scalars().all())
