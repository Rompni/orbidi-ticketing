import { useState } from "react";
import { useAuth } from "../stores/auth";
import { useWebSocket } from "../features/notifications/useWebSocket";
import { NotificationBell } from "../components/NotificationBell";
import { TicketDrawer } from "../components/TicketDrawer";
import { AiDrawer } from "../components/AiDrawer";
import TicketsPage from "./TicketsPage";
import KanbanPage from "./KanbanPage";

type View = "list" | "kanban";

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const apiUrl = import.meta.env.VITE_API_URL;
  const [view, setView] = useState<View>("list");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useWebSocket(!!user);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-semibold text-slate-800 flex-shrink-0">Orbidi Ticketing</h1>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(["list", "kanban"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors
                ${view === v
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {v === "list" ? "Lista" : "Kanban"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* AI assistant button */}
          <button
            onClick={() => setAiOpen(true)}
            title="Asistente IA"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </button>

          <NotificationBell onTicketClick={setSelectedTicketId} />

          {user?.avatar_url && (
            <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
          )}
          <span className="text-sm text-slate-600">{user?.name}</span>
          <form action={`${apiUrl}/auth/logout`} method="post">
            <button type="submit" className="text-sm text-slate-400 hover:text-slate-700 ml-1">
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {view === "list"
          ? <TicketsPage onTicketClick={setSelectedTicketId} />
          : <KanbanPage onTicketClick={setSelectedTicketId} />
        }
      </main>

      <TicketDrawer ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
      <AiDrawer isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
