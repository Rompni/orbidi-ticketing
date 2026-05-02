import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const WS_URL = (import.meta.env.VITE_API_URL as string).replace(/^http/, "ws") + "/ws";

export function useWebSocket(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let ws: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            ticket_id?: number | null;
          };
          if (msg.type === "notification") {
            qc.invalidateQueries({ queryKey: ["notifications"] });
            if (msg.ticket_id) {
              qc.invalidateQueries({ queryKey: ["tickets"] });
            }
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!destroyed) {
          retryTimeout = setTimeout(connect, 3_000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout !== null) clearTimeout(retryTimeout);
      ws?.close();
    };
  }, [enabled, qc]);
}
