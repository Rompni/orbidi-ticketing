# Orbidi Ticketing

Sistema de gestión de tickets para equipos de desarrollo. Incluye autenticación con Google, vistas de lista y Kanban, detalle de ticket con comentarios y adjuntos, notificaciones en tiempo real por WebSocket, y un asistente de IA con herramientas que operan sobre el mismo service layer que la API.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI + SQLAlchemy 2.0 async + Alembic + Authlib |
| Base de datos | PostgreSQL 16 |
| Frontend | Vite + React + TypeScript + TanStack Query + TanStack Table + Tailwind CSS |
| Drag & drop | @dnd-kit/core |
| Tiempo real | WebSockets (FastAPI nativo) |
| Asistente IA | Anthropic SDK (`claude-haiku-4-5`) con `tool_use` |
| Infra | Docker Compose |

---

## Funcionalidades

- **Auth** — OAuth 2.0 con Google, JWT en cookie `httpOnly` (no `localStorage`)
- **Tickets** — CRUD completo con estados, prioridades, autor y asignado
- **Vista lista** — tabla con columnas redimensionables y persistencia en `localStorage`, ordenamiento client-side, filtros server-side por estado y prioridad
- **Vista Kanban** — columnas por estado con drag & drop; arrastrar una card actualiza el status vía `PATCH` con optimistic update y rollback
- **Detalle de ticket** — drawer lateral con título editable inline, selects de estado/prioridad/asignado, descripción con detección de cambios, historial de comentarios y adjuntos descargables
- **Reasignación** — cualquier usuario autenticado puede reasignar un ticket desde el drawer; el cambio se refleja en lista y Kanban vía invalidación de caché
- **Comentarios** — CRUD con autor y timestamp
- **Adjuntos** — upload multipart con validación de tipo MIME y tamaño máximo configurable
- **Notificaciones** — badge en navbar con conteo de no leídas; dropdown con historial; al hacer click abre el ticket correspondiente
- **WebSockets** — conexión persistente por usuario autenticado con reconexión automática; las notificaciones entrantes actualizan el badge **y** refrescan la tabla/Kanban en tiempo real
- **Asistente IA** — chat con herramientas: `list_tickets`, `get_ticket`, `create_ticket`, `update_ticket_status`, `add_comment`, `reassign_ticket`, `list_users`; las mutaciones disparan las mismas notificaciones y actualizan las vistas igual que la UI

---

## Decisiones técnicas

### Backend

**SQLAlchemy 2.0 async + asyncpg**
Se eligió el modo async de SQLAlchemy 2.0 con el driver `asyncpg` para aprovechar el event loop de FastAPI sin bloquear threads. El patrón repository → service → API mantiene la lógica de negocio desacoplada y reutilizable.

**Service layer reutilizable**
El service layer (`services/tickets.py`, `services/comments.py`, etc.) no depende de FastAPI — recibe una sesión de DB y el usuario actual como parámetros. Esto permite que el asistente de IA llame exactamente las mismas funciones que los endpoints HTTP, garantizando que las mismas reglas de permisos y efectos secundarios (notificaciones, WebSocket events) se apliquen en ambos contextos.

**Cookie httpOnly para la sesión**
El JWT se almacena en una cookie `httpOnly; SameSite=Lax` en lugar de `localStorage`. Esto elimina el vector de robo de token vía XSS. La cookie se envía automáticamente en requests HTTP y en el handshake de WebSocket (mismo origen).

**WebSocket broker en memoria**
Un singleton `dict[int, set[WebSocket]]` indexado por `user_id` permite publicar eventos a todos los sockets conectados de un usuario sin dependencias externas. El diseño es migrable a Redis pub/sub añadiendo un adaptador sin cambiar el contrato de `broker.publish`.

**Alembic con asyncpg**
Las migraciones usan un engine sync separado internamente (requerimiento de Alembic) pero el motor principal de la aplicación es async.

### Frontend

**TanStack Query para estado del servidor**
Toda la data remota vive en el caché de React Query. Las mutaciones invalidan las queries afectadas (`["tickets"]`, `["comments", ticketId]`, etc.), lo que mantiene lista, Kanban y drawer sincronizados sin propagación manual de estado.

**TanStack Table con redimensionamiento persistente**
La configuración de columnas (`columnResizeMode: "onChange"`, `tableLayout: "fixed"`) permite redimensionar columnas en tiempo real. El tamaño se serializa en `localStorage` bajo la clave `tickets-table-sizing` para persistir entre sesiones.

**@dnd-kit con optimistic updates**
El drag & drop de Kanban usa `activationConstraint: { distance: 8 }` para evitar arrastres accidentales al hacer click. Al soltar en otra columna, el hook `useUpdateTicketStatus` aplica el cambio inmediatamente en el caché local y lo revierte si el PATCH falla.

**Zustand mínimo para auth**
Solo el objeto `User` vive en Zustand para que el navbar y otros componentes lean el usuario sin perforar props. Todo lo demás (tickets, comentarios, notificaciones) es estado de servidor gestionado por React Query.

### Asistente IA

**Loop agéntico con `tool_use`**
El endpoint `POST /ai/chat` recibe el historial de mensajes y ejecuta un loop de hasta 10 rondas de `tool_use`. En cada ronda: el modelo decide qué herramienta llamar → el backend la ejecuta → el resultado se devuelve al modelo como `tool_result` → el modelo responde o pide otra herramienta. La respuesta final y la lista de herramientas ejecutadas se devuelven al frontend en un solo JSON.

**Modelo claude-haiku-4-5**
Se eligió Haiku por ser el modelo más económico del stack actual. Para instrucciones con herramientas bien definidas y prompts claros, rinde de forma equivalente a modelos más grandes en este dominio acotado.

**API sin estado**
El frontend envía el historial completo de mensajes en cada request. El backend no mantiene sesión de conversación — el contexto vive en el cliente. Esto simplifica el backend y permite múltiples conversaciones paralelas sin gestión de sesiones.

---

## Requisitos previos

- Cuenta de Google Cloud con un OAuth 2.0 Client ID configurado

**Redirect URI autorizado en Google Cloud Console:**
```
http://localhost:8000/auth/google/callback
```

---

## Variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores reales. Los obligatorios son:

```bash
JWT_SECRET=una-cadena-larga-y-aleatoria
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
ANTHROPIC_API_KEY=sk-ant-...   # opcional, solo para el asistente IA
```

Las siguientes variables tienen valores distintos según cómo arranques el proyecto:

| Variable | Docker Compose | Local (sin Docker) |
|----------|---------------|-------------------|
| `POSTGRES_HOST` | `db` | `localhost` |
| `DATABASE_URL` | `...@db:5432/orbidi` | `...@localhost:5432/orbidi` |
| `UPLOAD_DIR` | `/app/uploads` | `/tmp/orbidi-uploads` (o cualquier ruta local) |

El `.env.example` viene configurado para Docker Compose. Si arrancas en local, ajusta esas tres variables.

---

## Arranque con Docker Compose (recomendado)

Requiere Docker y Docker Compose. Levanta base de datos, backend y frontend con un solo comando; las migraciones se aplican automáticamente al arrancar.

El `.env.example` ya tiene los valores correctos para este modo — solo hace falta completar las credenciales de Google OAuth y JWT.

```bash
docker compose up --build
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

Para detener:

```bash
docker compose down
```

---

## Arranque manual (sin Docker)

Requiere Python 3.12, Node.js 20+ y PostgreSQL 16 corriendo localmente.

Antes de arrancar, ajustar en `.env`:

```bash
POSTGRES_HOST=localhost
DATABASE_URL=postgresql+asyncpg://orbidi:orbidi_dev_pwd@localhost:5432/orbidi
UPLOAD_DIR=/tmp/orbidi-uploads
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Primera vez: crear tablas
alembic upgrade head

# Servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

API disponible en `http://localhost:8000` — docs en `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponible en `http://localhost:5173`.

---

## Estructura del proyecto

```
orbidi-ticketing/
├── backend/
│   └── app/
│       ├── ai/          # Asistente IA (loop agéntico + tools)
│       ├── api/         # Routers FastAPI
│       ├── core/        # Config, DB, seguridad, dependencias
│       ├── models/      # Modelos SQLAlchemy
│       ├── repositories/ # Acceso a datos
│       ├── schemas/     # Schemas Pydantic
│       ├── services/    # Lógica de negocio (reutilizada por API e IA)
│       └── ws/          # WebSocket broker
└── frontend/
    └── src/
        ├── api/         # Clientes HTTP por dominio
        ├── components/  # Componentes compartidos (drawer, badges, etc.)
        ├── features/    # Hooks por dominio (tickets, comments, ai, etc.)
        ├── pages/       # Páginas principales
        └── stores/      # Estado global (Zustand)
```

---

## Uso de IA en el desarrollo

Este proyecto fue desarrollado con asistencia de **Claude (Anthropic)** a lo largo de todo el proceso:

- **Diseño de arquitectura** — definición del stack, patrones repository/service.
- **Scaffolding inicial** — generación de modelos SQLAlchemy, schemas Pydantic, estructura de carpetas, configuración de Alembic y Vite
- **Implementación de features** — todos los componentes React, hooks de TanStack Query, integración de @dnd-kit, sistema de notificaciones, asistente de IA
- **Revisión y corrección** — detección de bugs (race condition en ProtectedRoute, MissingGreenlet en SQLAlchemy, conflicto de cookie con SessionMiddleware), ajustes de TypeScript con `verbatimModuleSyntax`
