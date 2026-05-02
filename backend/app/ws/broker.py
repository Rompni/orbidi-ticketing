from collections import defaultdict
from fastapi import WebSocket


class ConnectionBroker:
    def __init__(self) -> None:
        self._sockets: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        self._sockets[user_id].add(ws)

    def disconnect(self, user_id: int, ws: WebSocket) -> None:
        self._sockets[user_id].discard(ws)
        if not self._sockets.get(user_id):
            self._sockets.pop(user_id, None)

    async def publish(self, user_id: int, payload: dict) -> None:
        dead: set[WebSocket] = set()
        for ws in list(self._sockets.get(user_id, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(user_id, ws)


broker = ConnectionBroker()
