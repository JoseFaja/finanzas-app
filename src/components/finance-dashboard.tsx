"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Dashboard } from "@/components/figma/Dashboard";
import { LoginPage } from "@/components/figma/LoginPage";

export function FinanceDashboard() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <LoginPage onLogin={() => void signIn("google")} />;
  }

  return <Dashboard onLogout={() => void signOut()} />;
    setCuentas(await api<Cuenta[]>("/api/cuentas"));
  }

  async function deleteCuenta(id: number) {
    await api(`/api/cuentas/${id}`, { method: "DELETE" });
    setCuentas(await api<Cuenta[]>("/api/cuentas"));
  }

  async function createTransaccion() {
    await api("/api/transacciones", {
      method: "POST",
      body: JSON.stringify({
        idCuenta: Number(transaccionForm.idCuenta),
        idCategoria: transaccionForm.idCategoria ? Number(transaccionForm.idCategoria) : undefined,
        idMetodoPago: transaccionForm.idMetodoPago ? Number(transaccionForm.idMetodoPago) : undefined,
        monto: Number(transaccionForm.monto),
        descripcion: transaccionForm.descripcion || undefined,
        fecha: transaccionForm.fecha
          ? new Date(transaccionForm.fecha).toISOString()
          : undefined,
        esIngreso: transaccionForm.esIngreso,
      }),
    });

    setTransaccionForm({
      idCuenta: "",
      idCategoria: "",
      idMetodoPago: "",
      monto: "0",
      descripcion: "",
      fecha: "",
      esIngreso: false,
    });
    setTransacciones(await api<Transaccion[]>("/api/transacciones"));
  }

  async function deleteTransaccion(id: number) {
    await api(`/api/transacciones/${id}`, { method: "DELETE" });
    setTransacciones(await api<Transaccion[]>("/api/transacciones"));
  }

  async function createDeuda() {
    await api("/api/deudas", {
      method: "POST",
      body: JSON.stringify({
        idTipoDeuda: Number(deudaForm.idTipoDeuda),
        montoTotal: Number(deudaForm.montoTotal),
        saldoPendiente: Number(deudaForm.saldoPendiente),
        tasaIntereses: Number(deudaForm.tasaIntereses),
        cuotas: Number(deudaForm.cuotas),
        cuotasPagadas: Number(deudaForm.cuotasPagadas),
      }),
    });

    setDeudaForm({
      idTipoDeuda: "",
      montoTotal: "0",
      saldoPendiente: "0",
      tasaIntereses: "0",
      cuotas: "12",
      cuotasPagadas: "0",
    });
    setDeudas(await api<Deuda[]>("/api/deudas"));
  }

  async function deleteDeuda(id: number) {
    await api(`/api/deudas/${id}`, { method: "DELETE" });
    setDeudas(await api<Deuda[]>("/api/deudas"));
  }

  async function createObjetivo() {
    await api("/api/objetivos", {
      method: "POST",
      body: JSON.stringify({
        nombreObjetivo: objetivoForm.nombreObjetivo,
        idTipoObjetivo: Number(objetivoForm.idTipoObjetivo),
        montoMeta: Number(objetivoForm.montoMeta),
        fechaLimite: new Date(objetivoForm.fechaLimite).toISOString(),
        idPrioridad: objetivoForm.idPrioridad ? Number(objetivoForm.idPrioridad) : undefined,
        idCuenta: objetivoForm.idCuenta ? Number(objetivoForm.idCuenta) : undefined,
      }),
    });

    setObjetivoForm({
      nombreObjetivo: "",
      idTipoObjetivo: "",
      montoMeta: "0",
      fechaLimite: "",
      idPrioridad: "",
      idCuenta: "",
    });
    setObjetivos(await api<Objetivo[]>("/api/objetivos"));
  }

  async function deleteObjetivo(id: number) {
    await api(`/api/objetivos/${id}`, { method: "DELETE" });
    setObjetivos(await api<Objetivo[]>("/api/objetivos"));
  }

  if (status === "loading") {
    return <div className="p-8 text-center">Cargando sesión...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#dce2f0] px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-center text-5xl font-bold text-slate-900">FinanceApp</h1>
          <p className="mt-5 text-center text-xl text-slate-600">
            Gestiona tus finanzas personales de manera inteligente
          </p>
          <div className="mt-8 flex justify-center text-indigo-600">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-indigo-600 text-4xl font-black">
              $
            </div>
          </div>
          <p className="mt-8 text-center text-2xl text-slate-600">
            Inicia sesión con tu cuenta de Google para comenzar
          </p>
          <div className="mt-8 flex justify-center">
            <SignInButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-200 bg-white">
          <div className="p-6">
            <h1 className="text-5xl font-bold">FinanceApp</h1>
            <p className="mt-2 text-xl text-slate-500">Gestión Financiera Personal</p>
          </div>
          <nav className="px-4 py-2">
            <ul className="space-y-2">
              {menu.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`w-full rounded-xl px-4 py-3 text-left text-2xl font-semibold ${
                      view === item.id
                        ? "bg-[#020523] text-white"
                        : "text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
            <h2 className="text-5xl font-bold capitalize">{view}</h2>
            <button
              type="button"
              className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-100"
              onClick={() => setPerfilOpen(true)}
            >
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt="avatar"
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold">
                  {initials(perfil?.nombre, perfil?.apellido)}
                </div>
              )}
              <div className="text-left">
                <p className="text-2xl font-semibold">
                  {(perfil?.nombre ?? "Usuario")} {(perfil?.apellido ?? "")}
                </p>
                <p className="text-lg text-slate-500">{perfil?.correo ?? session.user?.email}</p>
              </div>
            </button>
          </header>

          <main className="p-8">
            {error ? <p className="mb-4 text-red-600">{error}</p> : null}
            {loading ? <p className="mb-4 text-slate-500">Cargando...</p> : null}

            {view === "cuentas" && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-6xl font-bold">Cuentas</h3>
                    <p className="text-3xl text-slate-500">Gestiona tus cuentas bancarias</p>
                  </div>
                  <button type="button" className="rounded-xl bg-[#020523] px-5 py-3 text-2xl font-semibold text-white" onClick={() => void createCuenta()}>
                    + Nueva cuenta
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-3xl font-semibold">Balance Total</p>
                  <p className="mt-4 text-6xl">{money(balanceTotal)}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  {cuentas.map((cuenta) => (
                    <article key={cuenta.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="flex justify-between">
                        <h4 className="text-3xl font-semibold">{cuenta.nombre}</h4>
                        <button type="button" className="text-red-500" onClick={() => void deleteCuenta(cuenta.id)}>🗑</button>
                      </div>
                      <p className="mt-6 text-5xl">{money(cuenta.saldoActual)}</p>
                      <p className="mt-2 text-xl text-slate-500">{cuenta.tipoCuenta?.nombre}</p>
                    </article>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-6 xl:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" placeholder="Nombre" value={cuentaForm.nombre} onChange={(e) => setCuentaForm((p) => ({ ...p, nombre: e.target.value }))} />
                  <select className="rounded-lg border border-slate-300 p-2 text-lg" value={cuentaForm.idTipoCuenta} onChange={(e) => setCuentaForm((p) => ({ ...p, idTipoCuenta: e.target.value }))}>
                    <option value="">Tipo de cuenta</option>
                    {(catalogs["tipo-cuenta"] ?? []).map((it) => (
                      <option key={it.id} value={it.id}>{it.nombre}</option>
                    ))}
                  </select>
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="number" step="0.01" value={cuentaForm.saldoActual} onChange={(e) => setCuentaForm((p) => ({ ...p, saldoActual: e.target.value }))} placeholder="Saldo inicial" />
                </div>
              </section>
            )}

            {view === "transacciones" && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-6xl font-bold">Transacciones</h3>
                    <p className="text-3xl text-slate-500">Registra tus ingresos y gastos</p>
                  </div>
                  <button type="button" className="rounded-xl bg-[#020523] px-5 py-3 text-2xl font-semibold text-white" onClick={() => void createTransaccion()}>
                    + Nueva transacción
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-3xl font-semibold">Ingresos totales</p>
                    <p className="mt-4 text-6xl text-green-600">{money(totalIngresos)}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-3xl font-semibold">Gastos totales</p>
                    <p className="mt-4 text-6xl text-red-600">{money(totalGastos)}</p>
                  </article>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-6 xl:grid-cols-3">
                  <select className="rounded-lg border border-slate-300 p-2 text-lg" value={transaccionForm.idCuenta} onChange={(e) => setTransaccionForm((p) => ({ ...p, idCuenta: e.target.value }))}>
                    <option value="">Cuenta</option>
                    {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <select className="rounded-lg border border-slate-300 p-2 text-lg" value={transaccionForm.idCategoria} onChange={(e) => setTransaccionForm((p) => ({ ...p, idCategoria: e.target.value }))}>
                    <option value="">Categoría</option>
                    {(catalogs.categoria ?? []).map((it) => <option key={it.id} value={it.id}>{it.descripcion}</option>)}
                  </select>
                  <select className="rounded-lg border border-slate-300 p-2 text-lg" value={transaccionForm.idMetodoPago} onChange={(e) => setTransaccionForm((p) => ({ ...p, idMetodoPago: e.target.value }))}>
                    <option value="">Método de pago</option>
                    {(catalogs["metodo-pago"] ?? []).map((it) => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                  </select>
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="number" step="0.01" value={transaccionForm.monto} onChange={(e) => setTransaccionForm((p) => ({ ...p, monto: e.target.value }))} placeholder="Monto" />
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" value={transaccionForm.descripcion} onChange={(e) => setTransaccionForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción" />
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="datetime-local" value={transaccionForm.fecha} onChange={(e) => setTransaccionForm((p) => ({ ...p, fecha: e.target.value }))} />
                  <label className="col-span-3 inline-flex items-center gap-2 text-lg">
                    <input type="checkbox" checked={transaccionForm.esIngreso} onChange={(e) => setTransaccionForm((p) => ({ ...p, esIngreso: e.target.checked }))} /> Es ingreso
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-3xl font-semibold">Historial de transacciones</p>
                  <ul className="mt-4 divide-y">
                    {transacciones.map((t) => (
                      <li key={t.id} className="flex items-center justify-between py-3 text-xl">
                        <div>
                          <p className="font-semibold">{t.descripcion || "Transacción"}</p>
                          <p className="text-slate-500">{t.categoria?.descripcion} · {t.cuenta?.nombre}</p>
                        </div>
                        <div className="text-right">
                          <p className={t.esIngreso ? "text-green-600" : "text-red-600"}>
                            {t.esIngreso ? "+" : "-"}{money(t.monto)}
                          </p>
                          <button type="button" className="text-sm text-red-500" onClick={() => void deleteTransaccion(t.id)}>
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {view === "deudas" && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-6xl font-bold">Deudas</h3>
                    <p className="text-3xl text-slate-500">Administra tus préstamos y deudas</p>
                  </div>
                  <button type="button" className="rounded-xl bg-[#020523] px-5 py-3 text-2xl font-semibold text-white" onClick={() => void createDeuda()}>
                    + Nueva deuda
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-3xl font-semibold">Deuda Total Pendiente</p>
                    <p className="mt-4 text-6xl text-red-600">{money(totalDeuda)}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-3xl font-semibold">Pago Mensual Total</p>
                    <p className="mt-4 text-6xl">{money(pagoMensual)}</p>
                  </article>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-6 xl:grid-cols-3">
                  <select className="rounded-lg border border-slate-300 p-2 text-lg" value={deudaForm.idTipoDeuda} onChange={(e) => setDeudaForm((p) => ({ ...p, idTipoDeuda: e.target.value }))}>
                    <option value="">Tipo de deuda</option>
                    {(catalogs["tipo-deuda"] ?? []).map((it) => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                  </select>
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="number" step="0.01" value={deudaForm.montoTotal} onChange={(e) => setDeudaForm((p) => ({ ...p, montoTotal: e.target.value }))} placeholder="Monto total" />
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="number" step="0.01" value={deudaForm.saldoPendiente} onChange={(e) => setDeudaForm((p) => ({ ...p, saldoPendiente: e.target.value }))} placeholder="Saldo pendiente" />
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="number" step="0.01" value={deudaForm.tasaIntereses} onChange={(e) => setDeudaForm((p) => ({ ...p, tasaIntereses: e.target.value }))} placeholder="Tasa intereses" />
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="number" value={deudaForm.cuotas} onChange={(e) => setDeudaForm((p) => ({ ...p, cuotas: e.target.value }))} placeholder="Cuotas" />
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="number" value={deudaForm.cuotasPagadas} onChange={(e) => setDeudaForm((p) => ({ ...p, cuotasPagadas: e.target.value }))} placeholder="Cuotas pagadas" />
                </div>

                <div className="space-y-4">
                  {deudas.map((d) => (
                    <article key={d.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-4xl font-semibold">{d.tipoDeuda?.nombre}</h4>
                        <button type="button" className="text-red-500" onClick={() => void deleteDeuda(d.id)}>🗑</button>
                      </div>
                      <p className="mt-3 text-xl text-slate-500">Progreso de pago</p>
                      <div className="mt-2 h-3 rounded bg-slate-200">
                        <div className="h-3 rounded bg-[#020523]" style={{ width: `${percent(Number(d.cuotasPagadas), Number(d.cuotas))}%` }} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xl">
                        <p>Monto total: <strong>{money(d.montoTotal)}</strong></p>
                        <p>Pendiente: <strong className="text-red-600">{money(d.saldoPendiente)}</strong></p>
                        <p>Cuotas: <strong>{d.cuotasPagadas}/{d.cuotas}</strong></p>
                        <p>Tasa interés: <strong>{String(d.tasaIntereses)}%</strong></p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {view === "objetivos" && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-6xl font-bold">Objetivos</h3>
                  <p className="text-3xl text-slate-500">Define y monitorea tus metas financieras</p>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-6 xl:grid-cols-3">
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" placeholder="Nombre objetivo" value={objetivoForm.nombreObjetivo} onChange={(e) => setObjetivoForm((p) => ({ ...p, nombreObjetivo: e.target.value }))} />
                  <select className="rounded-lg border border-slate-300 p-2 text-lg" value={objetivoForm.idTipoObjetivo} onChange={(e) => setObjetivoForm((p) => ({ ...p, idTipoObjetivo: e.target.value }))}>
                    <option value="">Tipo objetivo</option>
                    {(catalogs["tipo-objetivo"] ?? []).map((it) => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                  </select>
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="number" step="0.01" value={objetivoForm.montoMeta} onChange={(e) => setObjetivoForm((p) => ({ ...p, montoMeta: e.target.value }))} placeholder="Monto meta" />
                  <input className="rounded-lg border border-slate-300 p-2 text-lg" type="datetime-local" value={objetivoForm.fechaLimite} onChange={(e) => setObjetivoForm((p) => ({ ...p, fechaLimite: e.target.value }))} />
                  <select className="rounded-lg border border-slate-300 p-2 text-lg" value={objetivoForm.idPrioridad} onChange={(e) => setObjetivoForm((p) => ({ ...p, idPrioridad: e.target.value }))}>
                    <option value="">Prioridad</option>
                    {(catalogs.prioridad ?? []).map((it) => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                  </select>
                  <select className="rounded-lg border border-slate-300 p-2 text-lg" value={objetivoForm.idCuenta} onChange={(e) => setObjetivoForm((p) => ({ ...p, idCuenta: e.target.value }))}>
                    <option value="">Cuenta asociada</option>
                    {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button type="button" onClick={() => void createObjetivo()} className="col-span-3 rounded-lg bg-[#020523] px-4 py-2 text-2xl font-semibold text-white">
                    Crear objetivo
                  </button>
                </div>

                <div className="space-y-4">
                  {objetivos.map((o) => (
                    <article key={o.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-4xl font-semibold">{o.nombreObjetivo}</h4>
                        <button type="button" className="text-red-500" onClick={() => void deleteObjetivo(o.id)}>🗑</button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xl">
                        <p>Monto meta: <strong>{money(o.montoMeta)}</strong></p>
                        <p>Fecha límite: <strong>{new Date(o.fechaLimite).toLocaleDateString("es-CO")}</strong></p>
                        <p>Prioridad: <strong>{o.prioridad?.nombre ?? "Sin prioridad"}</strong></p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {view === "score" && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-6xl font-bold">Score Financiero</h3>
                  <p className="text-3xl text-slate-500">Monitorea tu salud financiera mes a mes</p>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-3xl font-semibold">Score Actual</p>
                    <p className="mt-4 text-7xl font-bold">{score?.scoreActual ?? 0}<span className="text-2xl text-slate-500"> /1000</span></p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-3xl font-semibold">Evolución del Score</p>
                    <div className="mt-4 space-y-2 text-lg text-slate-600">
                      {(score?.historial ?? []).map((item) => (
                        <div key={item.mes} className="flex justify-between rounded bg-slate-50 px-3 py-2">
                          <span>{item.mes}</span>
                          <span>{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>

                <article className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-3xl font-semibold">Factores del Score</p>
                  <div className="mt-4 space-y-4">
                    {(score?.factores ?? []).map((f) => (
                      <div key={f.nombre}>
                        <div className="flex justify-between text-xl">
                          <p>{f.nombre}</p>
                          <p>{f.valor}/100</p>
                        </div>
                        <p className="text-lg text-slate-500">{f.descripcion}</p>
                        <div className="mt-1 h-2 rounded bg-slate-200">
                          <div className="h-2 rounded bg-green-600" style={{ width: `${f.valor}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            )}
          </main>
        </div>
      </div>

      {perfilOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-semibold">Editar perfil</h3>
              <button type="button" onClick={() => setPerfilOpen(false)} className="text-slate-500">✕</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 p-2 text-lg" placeholder="Nombre" value={perfilForm.nombre} onChange={(e) => setPerfilForm((p) => ({ ...p, nombre: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 p-2 text-lg" placeholder="Apellido" value={perfilForm.apellido} onChange={(e) => setPerfilForm((p) => ({ ...p, apellido: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 p-2 text-lg" placeholder="Número documento" value={perfilForm.numeroDocumento} onChange={(e) => setPerfilForm((p) => ({ ...p, numeroDocumento: e.target.value }))} />
              <select className="rounded-lg border border-slate-300 p-2 text-lg" value={perfilForm.idTipoDocumento} onChange={(e) => setPerfilForm((p) => ({ ...p, idTipoDocumento: e.target.value }))}>
                <option value="">Tipo documento</option>
                {(catalogs["tipo-documento"] ?? []).map((it) => (
                  <option key={it.id} value={it.id}>{it.nombre}</option>
                ))}
              </select>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <SignOutButton />
              <button type="button" className="rounded-lg bg-[#020523] px-4 py-2 text-xl font-semibold text-white" onClick={() => void savePerfil()}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
