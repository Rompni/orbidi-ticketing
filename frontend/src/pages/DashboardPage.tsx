import { useAuth } from "../stores/auth";

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const apiUrl = import.meta.env.VITE_API_URL;

  return (
    <div className="min-h-screen p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          {user?.avatar_url && (
            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
          )}
          <span>{user?.name}</span>
          <form action={`${apiUrl}/auth/logout`} method="post">
            <button type="submit" className="text-sm text-slate-600 hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>
      <p className="text-slate-500">Aquí irán las vistas Lista y Kanban.</p>
    </div>
  );
}
