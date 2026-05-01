import { useAuth } from "../stores/auth";
import TicketsPage from "./TicketsPage";

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const apiUrl = import.meta.env.VITE_API_URL;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Orbidi Ticketing</h1>
        <div className="flex items-center gap-3">
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

      <main className="max-w-6xl mx-auto px-6 py-6">
        <TicketsPage />
      </main>
    </div>
  );
}
