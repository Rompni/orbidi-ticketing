import { api } from "../lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface ChatResponse {
  response: string;
  tool_calls: ToolCall[];
}

export const aiApi = {
  status: () =>
    api.get<{ available: boolean }>("/ai/status").then((r) => r.data),

  chat: (messages: ChatMessage[]) =>
    api.post<ChatResponse>("/ai/chat", { messages }).then((r) => r.data),
};
