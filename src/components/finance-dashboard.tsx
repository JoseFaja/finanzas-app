"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";

type CatalogItem = { id: number; nombre?: string; descripcion?: string };

type Cuenta = {
  id: number;
  nombre: string;
  saldoActual: string | number;
  tipoCuenta?: { nombre: string };
};

type Transaccion = {
  id: number;
  monto: string | number;
  descripcion?: string | null;
  fecha: string;
  esIngreso: boolean;
  cuenta?: { nombre: string };
  categoria?: { descripcion: string } | null;
};

type Deuda = {
  id: number;
  montoTotal: string | number;
  saldoPendiente: string | number;
  tasaIntereses: string | number;
  cuotas: number;
  cuotasPagadas: number;
  tipoDeuda?: { nombre: string };
};

type Objetivo = {
  id: number;
  nombreObjetivo: string;
  montoMeta: string | number;
  fechaLimite: string;
  prioridad?: { nombre: string } | null;
};

type ScoreData = {
  scoreActual: number;
  historial: Array<{ mes: string; score: number }>;
  factores: Array<{ nombre: string; valor: number; descripcion: string }>;
  flujo: Array<{ mes: string; ingresos: number; gastos: number; ahorros: number }>;
};

type Perfil = {
  nombre?: string | null;
  apellido?: string | null;
  correo: string;
  numeroDocumento?: string | null;
  idTipoDocumento?: number | null;
};

type View = "cuentas" | "transacciones" | "deudas" | "objetivos" | "score";

const menu: { id: View; label: string }[] = [
  { id: "cuentas", label: "Cuentas" },
  { id: "transacciones", label: "Transacciones" },
  { id: "deudas", label: "Deudas" },
  { id: "objetivos", label: "Objetivos" },
  { id: "score", label: "Score" },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de red" }));
    throw new Error(err.error ?? "Error de servidor");
  }

  return res.json();
}

function money(value: string | number) {
  const numeric = Number(value);
  return `$ ${numeric.toLocaleString("es-CO")}`;
}

function percent(paid: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((paid / total) * 100);
}

function initials(name?: string | null, lastName?: string | null) {
  return `${name?.[0] ?? "U"}${lastName?.[0] ?? ""}`.toUpperCase();
}

export function FinanceDashboard() {
  const { data: session, status } = useSession();

  const [view, setView] = useState<View>("cuentas");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [catalogs, setCatalogs] = useState<Record<string, CatalogItem[]>>({});
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [perfilForm, setPerfilForm] = useState({
    nombre: "",
    apellido: "",
    numeroDocumento: "",
    idTipoDocumento: "",
  });

  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [score, setScore] = useState<ScoreData | null>(null);

  const [cuentaForm, setCuentaForm] = useState({ nombre: "", idTipoCuenta: "", saldoActual: "0" });
  const [transaccionForm, setTransaccionForm] = useState({
    idCuenta: "",
    idCategoria: "",
    idMetodoPago: "",
    monto: "0",
    descripcion: "",
    fecha: "",
    esIngreso: false,
  });
  const [deudaForm, setDeudaForm] = useState({
    idTipoDeuda: "",
    montoTotal: "0",
    saldoPendiente: "0",
    tasaIntereses: "0",
    cuotas: "12",
    cuotasPagadas: "0",
  });
  const [objetivoForm, setObjetivoForm] = useState({
    nombreObjetivo: "",
    idTipoObjetivo: "",
    montoMeta: "0",
    fechaLimite: "",
    idPrioridad: "",
    idCuenta: "",
  });

  const balanceTotal = useMemo(
    () => cuentas.reduce((acc, c) => acc + Number(c.saldoActual), 0),
    [cuentas],
  );

  const totalIngresos = useMemo(
    () => transacciones.filter((t) => t.esIngreso).reduce((acc, t) => acc + Number(t.monto), 0),
    [transacciones],
  );

  const totalGastos = useMemo(
    () => transacciones.filter((t) => !t.esIngreso).reduce((acc, t) => acc + Number(t.monto), 0),
    [transacciones],
  );

  const totalDeuda = useMemo(
    () => deudas.reduce((acc, d) => acc + Number(d.saldoPendiente), 0),
    [deudas],
  );

  const pagoMensual = useMemo(
    () =>
      deudas.reduce((acc, d) => {
        const total = Number(d.montoTotal);
        return acc + (total > 0 ? total / Number(d.cuotas || 1) : 0);
      }, 0),
    [deudas],
  );

  async function loadCatalog(name: string) {
    const data = await api<CatalogItem[]>(`/api/catalogos/${name}`);
    setCatalogs((prev) => ({ ...prev, [name]: data }));
  }

  async function ensureCatalogSeeds() {
    const rules: Array<{ entity: string; values: string[]; key: "nombre" | "descripcion" }> = [
      {
        entity: "tipo-cuenta",
        values: ["Cuenta Ahorros", "Cuenta Corriente", "Depósito de Bajo Monto"],
        key: "nombre",
      },
      {
        entity: "categoria",
        values: [
          "Gastos del hogar",
          "Restaurantes",
          "Impuestos",
          "Transporte",
          "Salud",
          "Educación",
          "Entretenimiento",
          "Ingresos salariales",
          "Ingresos extra",
        ],
        key: "descripcion",
      },
      {
        entity: "metodo-pago",
        values: ["Tarjeta de crédito", "De contado", "Efectivo"],
        key: "nombre",
      },
      {
        entity: "tipo-objetivo",
        values: ["Fondo de emergencia", "Viaje", "Compra de vivienda", "Educación"],
        key: "nombre",
      },
      {
        entity: "tipo-deuda",
        values: ["Préstamo vehículo", "Tarjeta de crédito", "Préstamo personal"],
        key: "nombre",
      },
      { entity: "prioridad", values: ["Alta", "Media", "Baja"], key: "nombre" },
      {
        entity: "tipo-documento",
        values: ["CC", "TI", "CE", "Pasaporte"],
        key: "nombre",
      },
    ];

    for (const rule of rules) {
      const current = await api<CatalogItem[]>(`/api/catalogos/${rule.entity}`);
      const existing = new Set(current.map((x) => (x.nombre ?? x.descripcion ?? "").toLowerCase()));

      for (const value of rule.values) {
        if (existing.has(value.toLowerCase())) {
          continue;
        }

        await api(`/api/catalogos/${rule.entity}`, {
          method: "POST",
          body: JSON.stringify({ [rule.key]: value }),
        });
      }

      await loadCatalog(rule.entity);
    }
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      await ensureCatalogSeeds();

      const [perfilData, cuentasData, txData, deudasData, objetivosData, scoreData] =
        await Promise.all([
          api<Perfil>("/api/perfil"),
          api<Cuenta[]>("/api/cuentas"),
          api<Transaccion[]>("/api/transacciones"),
          api<Deuda[]>("/api/deudas"),
          api<Objetivo[]>("/api/objetivos"),
          api<ScoreData>("/api/score"),
        ]);

      setPerfil(perfilData);
      setPerfilForm({
        nombre: perfilData.nombre ?? "",
        apellido: perfilData.apellido ?? "",
        numeroDocumento: perfilData.numeroDocumento ?? "",
        idTipoDocumento: perfilData.idTipoDocumento ? String(perfilData.idTipoDocumento) : "",
      });
      setCuentas(cuentasData);
      setTransacciones(txData);
      setDeudas(deudasData);
      setObjetivos(objetivosData);
      setScore(scoreData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadAll();
    }
  }, [status]);

  async function savePerfil() {
    try {
      const updated = await api<Perfil>("/api/perfil", {
        method: "PUT",
        body: JSON.stringify({
          nombre: perfilForm.nombre,
          apellido: perfilForm.apellido,
          numeroDocumento: perfilForm.numeroDocumento || null,
          idTipoDocumento: perfilForm.idTipoDocumento
            ? Number(perfilForm.idTipoDocumento)
            : null,
        }),
      });
      setPerfil(updated);
      setPerfilOpen(false);
      alert("Perfil actualizado");
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  }

  async function createCuenta() {
    await api("/api/cuentas", {
      method: "POST",
      body: JSON.stringify({
        nombre: cuentaForm.nombre,
        idTipoCuenta: Number(cuentaForm.idTipoCuenta),
        saldoActual: Number(cuentaForm.saldoActual),
      }),
    });
    setCuentaForm({ nombre: "", idTipoCuenta: "", saldoActual: "0" });
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
