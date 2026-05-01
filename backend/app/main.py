from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.api import auth, tickets, comments, attachments

app = FastAPI(
    title="Orbidi Ticketing API",
    swagger_ui_parameters={"persistAuthorization": True},
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version="0.1.0", routes=app.routes)
    schema["components"]["securitySchemes"] = {
        "cookieAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "Cookie",
            "description": 'Pega: access_token=&lt;tu_token&gt;',
        }
    }
    public_paths = {"/health", "/auth/google/login", "/auth/google/callback"}
    for path, operations in schema.get("paths", {}).items():
        if path not in public_paths:
            for operation in operations.values():
                operation["security"] = [{"cookieAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(comments.router)
app.include_router(attachments.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
