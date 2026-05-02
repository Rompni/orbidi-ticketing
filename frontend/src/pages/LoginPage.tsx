export default function LoginPage() {
  const apiUrl = import.meta.env.VITE_API_URL;
  document.title = "Iniciar sesión — Orbidi Ticketing";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Orbidi Ticketing</h1>
        <a
          href={`${apiUrl}/auth/google/login`}
          className="block w-full text-center bg-slate-900 text-white py-2 px-4 rounded hover:bg-slate-800"
        >
          Continuar con Google
        </a>
      </div>
    </div>
  );
}
