import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { aiApi, type ToolCall } from "../../api/ai";

export interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

const TOOLS_THAT_MUTATE = new Set([
  "create_ticket",
  "update_ticket_status",
  "add_comment",
  "reassign_ticket",
]);

export function useChat() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: "assistant",
      content:
        "Hola, soy tu asistente de tickets. Puedo listar, crear, actualizar estado, comentar y reasignar tickets. ¿En qué te ayudo?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage(text: string) {
    const next: DisplayMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(next);
    setIsLoading(true);

    try {
      const payload = next.map((m) => ({ role: m.role, content: m.content }));
      const result = await aiApi.chat(payload);

      setMessages([
        ...next,
        {
          role: "assistant",
          content: result.response,
          toolCalls: result.tool_calls.length ? result.tool_calls : undefined,
        },
      ]);

      if (result.tool_calls.some((tc) => TOOLS_THAT_MUTATE.has(tc.tool))) {
        qc.invalidateQueries({ queryKey: ["tickets"] });
        qc.invalidateQueries({ queryKey: ["comments"] });
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Ocurrió un error. Intenta de nuevo." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setMessages([
      {
        role: "assistant",
        content:
          "Hola, soy tu asistente de tickets. Puedo listar, crear, actualizar estado, comentar y reasignar tickets. ¿En qué te ayudo?",
      },
    ]);
  }

  return { messages, isLoading, sendMessage, reset };
}
