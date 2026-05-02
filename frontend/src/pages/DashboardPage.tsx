import { useState } from "react";
import { useAuth } from "../stores/auth";
import { TicketDrawer } from "../components/TicketDrawer";
import TicketsPage from "./TicketsPage";
import KanbanPage from "./KanbanPage";

type View = "list" | "kanban";

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const apiUrl = import.meta.env.VITE_API_URL;
  const [view, setView] = useState<View>("list");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

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

        <div className="ml-auto flex items-center gap-3">
          {user?.avatar_url && (
            <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
          )}
          <span className="text-sm text-slate-600">{user?.name}</span>
          <form action={`${apiUrl}/auth/logout`} method="post">
            <button type="submit" className="text-sm text-slate-400 hover:text-slate-700">
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
    </div>
  );
}
