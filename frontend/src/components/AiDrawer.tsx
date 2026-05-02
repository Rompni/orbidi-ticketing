import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useChat, type DisplayMessage } from "../features/ai/useChat";
import { type ToolCall } from "../api/ai";

// ─── tool label map ──────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  list_tickets: "Listó tickets",
  get_ticket: "Consultó ticket",
  create_ticket: "Creó ticket",
  update_ticket_status: "Actualizó estado",
  add_comment: "Agregó comentario",
  reassign_ticket: "Reasignó ticket",
  list_users: "Listó usuarios",
};

function toolSummary(tc: ToolCall): string {
  const label = TOOL_LABELS[tc.tool] ?? tc.tool;
  const r = tc.result as Record<string, unknown>;

  if (tc.tool === "create_ticket" && r.id)
    return `${label} #${r.id}: "${r.title}"`;
  if ((tc.tool === "update_ticket_status" || tc.tool === "reassign_ticket") && r.id)
    return `${label} #${r.id}`;
  if (tc.tool === "list_tickets" && typeof r.total === "number")
    return `${label} (${r.total} resultados)`;
  if (tc.tool === "add_comment" && r.id)
    return `${label} en ticket`;
  return label;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ToolCallPills({ toolCalls }: { toolCalls: ToolCall[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {toolCalls.map((tc, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
          {toolSummary(tc)}
        </span>
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-slate-900 text-white text-sm rounded-2xl rounded-tr-sm px-3.5 py-2.5 leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {msg.toolCalls && <ToolCallPills toolCalls={msg.toolCalls} />}
      <div className="max-w-[90%] bg-white border border-slate-200 text-slate-800 text-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc ml-4 mb-1.5 space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-4 mb-1.5 space-y-0.5">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children }) => (
              <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ),
            h1: ({ children }) => <h1 className="font-semibold text-slate-900 mb-1">{children}</h1>,
            h2: ({ children }) => <h2 className="font-semibold text-slate-900 mb-1">{children}</h2>,
            h3: ({ children }) => <h3 className="font-medium text-slate-900 mb-1">{children}</h3>,
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl rounded-tl-sm w-fit shadow-sm">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ─── drawer shell ────────────────────────────────────────────────────────────

export function AiDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { messages, isLoading, sendMessage, reset } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-slate-50 shadow-xl flex flex-col
          transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-800">Asistente IA</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={reset}
              title="Nueva conversación"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 resize-none
                focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50 min-h-[42px] max-h-32 leading-snug"
              placeholder="Escribe un mensaje… (Enter para enviar)"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40
                transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
