from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_access_token
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(400, f"OAuth error: {e}")

    info = token.get("userinfo")
    if not info:
        raise HTTPException(400, "No userinfo in token")

    sub = info["sub"]
    result = await db.execute(select(User).where(User.google_sub == sub))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            google_sub=sub,
            email=info["email"],
            name=info.get("name", info["email"]),
            avatar_url=info.get("picture"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    jwt_token = create_access_token(str(user.id))
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.set_cookie(
        key="session",
        value=jwt_token,
        httponly=True,
        secure=False,  # True en producción con HTTPS
        samesite="lax",
        max_age=settings.JWT_EXPIRES_MIN * 60,
    )
    return response


@router.post("/logout")
async def logout():
    response = RedirectResponse(url=settings.FRONTEND_URL, status_code=303)
    response.delete_cookie("session")
    return response


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
    }
