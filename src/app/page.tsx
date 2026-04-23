import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <main className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Finanzas App</h1>
        <p className="mt-2 text-slate-600">
          Base inicial lista: autenticacion con Google y CRUD de cuentas y
          transacciones protegido por usuario.
        </p>

        <section className="mt-6 rounded-lg bg-slate-100 p-4">
          <h2 className="font-semibold text-slate-800">Sesion</h2>
          {session ? (
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <p>
                Sesion activa: <strong>{session.user?.email}</strong>
              </p>
              <SignOutButton />
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <p>No has iniciado sesion.</p>
              <SignInButton />
            </div>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-800">Endpoints disponibles</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>GET/POST /api/cuentas</li>
            <li>PUT/DELETE /api/cuentas/:id</li>
            <li>GET/POST /api/transacciones</li>
            <li>PUT/DELETE /api/transacciones/:id</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
