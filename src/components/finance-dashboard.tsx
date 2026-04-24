"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";

type CatalogItem = {
  id: number;
  nombre?: string;
  descripcion?: string;
};

type Cuenta = {
  id: number;
  nombre: string;
  saldoActual: string | number;
  idTipoCuenta: number;
  tipoCuenta?: { id: number; nombre: string };
};

type Transaccion = {
  id: number;
  monto: string | number;
  descripcion?: string | null;
  fecha: string;
  esIngreso: boolean;
  cuenta?: { id: number; nombre: string };
  categoria?: { id: number; descripcion: string } | null;
};

type Objetivo = {
  id: number;
  nombreObjetivo: string;
  montoMeta: string | number;
  fechaLimite: string;
};

type Perfil = {
  id: number;
  nombre?: string | null;
  apellido?: string | null;
  correo: string;
  numeroDocumento?: string | null;
  idTipoDocumento?: number | null;
  idEstado?: number | null;
};

type View = "cuentas" | "transacciones" | "objetivos" | "catalogos" | "perfil";

const catalogEntities = [
  { id: "tipo-cuenta", label: "Tipo de cuenta" },
  { id: "categoria", label: "Categoría" },
  { id: "metodo-pago", label: "Método de pago" },
  { id: "tipo-objetivo", label: "Tipo de objetivo" },
  { id: "prioridad", label: "Prioridad" },
  { id: "estado", label: "Estado" },
  { id: "tipo-documento", label: "Tipo documento" },
] as const;

const menu: { id: View; label: string }[] = [
  { id: "cuentas", label: "Cuentas" },
  { id: "transacciones", label: "Transacciones" },
  { id: "objetivos", label: "Objetivos" },
  { id: "catalogos", label: "Catálogos" },
  { id: "perfil", label: "Perfil" },
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

function valueOfCatalog(item: CatalogItem) {
  return item.nombre ?? item.descripcion ?? "";
}

function parseDateForInput(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function FinanceDashboard() {
  const { data: session, status } = useSession();

  const [view, setView] = useState<View>("cuentas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [perfilForm, setPerfilForm] = useState({
    nombre: "",
    apellido: "",
    numeroDocumento: "",
    idTipoDocumento: "",
    idEstado: "",
  });

  const [catalogs, setCatalogs] = useState<Record<string, CatalogItem[]>>({});
  const [catalogEntity, setCatalogEntity] = useState<string>("tipo-cuenta");
  const [catalogNewValue, setCatalogNewValue] = useState("");

  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaForm, setCuentaForm] = useState({
    nombre: "",
    idTipoCuenta: "",
    saldoActual: "0",
  });

  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [transaccionForm, setTransaccionForm] = useState({
    idCuenta: "",
    idCategoria: "",
    idMetodoPago: "",
    monto: "0",
    descripcion: "",
    fecha: "",
    esIngreso: false,
  });

  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [objetivoForm, setObjetivoForm] = useState({
    nombreObjetivo: "",
    idTipoObjetivo: "",
    montoMeta: "0",
    fechaLimite: "",
    idPrioridad: "",
    idEstado: "",
    idCuenta: "",
  });

  const currentCatalog = useMemo(
    () => catalogs[catalogEntity] ?? [],
    [catalogEntity, catalogs],
  );

  async function loadCatalog(entity: string) {
    const data = await api<CatalogItem[]>(`/api/catalogos/${entity}`);
    setCatalogs((prev) => ({ ...prev, [entity]: data }));
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [perfilData, cuentasData, transaccionesData, objetivosData] =
        await Promise.all([
          api<Perfil>("/api/perfil"),
          api<Cuenta[]>("/api/cuentas"),
          api<Transaccion[]>("/api/transacciones"),
          api<Objetivo[]>("/api/objetivos"),
        ]);

      setPerfil(perfilData);
      setPerfilForm({
        nombre: perfilData?.nombre ?? "",
        apellido: perfilData?.apellido ?? "",
        numeroDocumento: perfilData?.numeroDocumento ?? "",
        idTipoDocumento: perfilData?.idTipoDocumento
          ? String(perfilData.idTipoDocumento)
          : "",
        idEstado: perfilData?.idEstado ? String(perfilData.idEstado) : "",
      });
      setCuentas(cuentasData);
      setTransacciones(transaccionesData);
      setObjetivos(objetivosData);

      await Promise.all(catalogEntities.map((e) => loadCatalog(e.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar datos");
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
          idEstado: perfilForm.idEstado ? Number(perfilForm.idEstado) : null,
        }),
      });
      setPerfil(updated);
      alert("Perfil actualizado");
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo actualizar perfil");
    }
  }

  async function createCatalogItem() {
    try {
      if (!catalogNewValue.trim()) {
        return;
      }

      const key = catalogEntity === "categoria" ? "descripcion" : "nombre";
      await api(`/api/catalogos/${catalogEntity}`, {
        method: "POST",
        body: JSON.stringify({ [key]: catalogNewValue }),
      });
      setCatalogNewValue("");
      await loadCatalog(catalogEntity);
      alert("Catálogo actualizado");
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo crear elemento");
    }
  }

  async function editCatalogItem(item: CatalogItem) {
    const next = window.prompt("Nuevo valor", valueOfCatalog(item));

    if (!next) {
      return;
    }

    try {
      const key = catalogEntity === "categoria" ? "descripcion" : "nombre";
      await api(`/api/catalogos/${catalogEntity}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ [key]: next }),
      });
      await loadCatalog(catalogEntity);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo editar");
    }
  }

  async function deleteCatalogItem(item: CatalogItem) {
    if (!window.confirm("¿Eliminar este registro de catálogo?")) {
      return;
    }

    try {
      await api(`/api/catalogos/${catalogEntity}/${item.id}`, {
        method: "DELETE",
      });
      await loadCatalog(catalogEntity);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  async function createCuenta() {
    try {
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
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo crear cuenta");
    }
  }

  async function updateCuenta(cuenta: Cuenta) {
    const nuevoNombre = window.prompt("Nuevo nombre", cuenta.nombre);

    if (!nuevoNombre) {
      return;
    }

    try {
      await api(`/api/cuentas/${cuenta.id}`, {
        method: "PUT",
        body: JSON.stringify({ nombre: nuevoNombre }),
      });
      setCuentas(await api<Cuenta[]>("/api/cuentas"));
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo editar cuenta");
    }
  }

  async function deleteCuenta(id: number) {
    if (!window.confirm("¿Eliminar esta cuenta?")) {
      return;
    }

    try {
      await api(`/api/cuentas/${id}`, { method: "DELETE" });
      setCuentas(await api<Cuenta[]>("/api/cuentas"));
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar cuenta");
    }
  }

  async function createTransaccion() {
    try {
      await api("/api/transacciones", {
        method: "POST",
        body: JSON.stringify({
          idCuenta: Number(transaccionForm.idCuenta),
          idCategoria: transaccionForm.idCategoria
            ? Number(transaccionForm.idCategoria)
            : undefined,
          idMetodoPago: transaccionForm.idMetodoPago
            ? Number(transaccionForm.idMetodoPago)
            : undefined,
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
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo crear transacción");
    }
  }

  async function deleteTransaccion(id: number) {
    if (!window.confirm("¿Eliminar esta transacción?")) {
      return;
    }

    try {
      await api(`/api/transacciones/${id}`, { method: "DELETE" });
      setTransacciones(await api<Transaccion[]>("/api/transacciones"));
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar transacción");
    }
  }

  async function createObjetivo() {
    try {
      await api("/api/objetivos", {
        method: "POST",
        body: JSON.stringify({
          nombreObjetivo: objetivoForm.nombreObjetivo,
          idTipoObjetivo: Number(objetivoForm.idTipoObjetivo),
          montoMeta: Number(objetivoForm.montoMeta),
          fechaLimite: new Date(objetivoForm.fechaLimite).toISOString(),
          idPrioridad: objetivoForm.idPrioridad
            ? Number(objetivoForm.idPrioridad)
            : undefined,
          idEstado: objetivoForm.idEstado ? Number(objetivoForm.idEstado) : undefined,
          idCuenta: objetivoForm.idCuenta ? Number(objetivoForm.idCuenta) : undefined,
        }),
      });

      setObjetivoForm({
        nombreObjetivo: "",
        idTipoObjetivo: "",
        montoMeta: "0",
        fechaLimite: "",
        idPrioridad: "",
        idEstado: "",
        idCuenta: "",
      });
      setObjetivos(await api<Objetivo[]>("/api/objetivos"));
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo crear objetivo");
    }
  }

  async function deleteObjetivo(id: number) {
    if (!window.confirm("¿Eliminar este objetivo?")) {
      return;
    }

    try {
      await api(`/api/objetivos/${id}`, { method: "DELETE" });
      setObjetivos(await api<Objetivo[]>("/api/objetivos"));
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar objetivo");
    }
  }

  function renderMain() {
    if (view === "perfil") {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Editar perfil</h2>
          <p className="mt-1 text-sm text-slate-500">
            Actualiza tus datos personales para la demostración del CRUD.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border border-slate-300 p-2" placeholder="Nombre" value={perfilForm.nombre} onChange={(e) => setPerfilForm((p) => ({ ...p, nombre: e.target.value }))} />
            <input className="rounded-lg border border-slate-300 p-2" placeholder="Apellido" value={perfilForm.apellido} onChange={(e) => setPerfilForm((p) => ({ ...p, apellido: e.target.value }))} />
            <input className="rounded-lg border border-slate-300 p-2" placeholder="Número documento" value={perfilForm.numeroDocumento} onChange={(e) => setPerfilForm((p) => ({ ...p, numeroDocumento: e.target.value }))} />
            <select className="rounded-lg border border-slate-300 p-2" value={perfilForm.idTipoDocumento} onChange={(e) => setPerfilForm((p) => ({ ...p, idTipoDocumento: e.target.value }))}>
              <option value="">Tipo documento</option>
              {(catalogs["tipo-documento"] ?? []).map((it) => <option key={it.id} value={it.id}>{valueOfCatalog(it)}</option>)}
            </select>
            <select className="rounded-lg border border-slate-300 p-2" value={perfilForm.idEstado} onChange={(e) => setPerfilForm((p) => ({ ...p, idEstado: e.target.value }))}>
              <option value="">Estado</option>
              {(catalogs.estado ?? []).map((it) => <option key={it.id} value={it.id}>{valueOfCatalog(it)}</option>)}
            </select>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => void savePerfil()} type="button">Guardar perfil</button>
            <span className="text-xs text-slate-500">Correo autenticado: {perfil?.correo ?? session?.user?.email}</span>
          </div>
        </section>
      );
    }

    if (view === "catalogos") {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Gestión de catálogos</h2>
          <p className="mt-1 text-sm text-slate-500">Crea y edita los valores de referencia del sistema.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <select className="rounded-lg border border-slate-300 p-2" value={catalogEntity} onChange={(e) => { setCatalogEntity(e.target.value); void loadCatalog(e.target.value); }}>
              {catalogEntities.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <input className="min-w-[220px] flex-1 rounded-lg border border-slate-300 p-2" placeholder="Nuevo valor" value={catalogNewValue} onChange={(e) => setCatalogNewValue(e.target.value)} />
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void createCatalogItem()} type="button">Agregar</button>
          </div>
          <ul className="mt-4 divide-y rounded-lg border border-slate-200">
            {currentCatalog.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{item.id}. {valueOfCatalog(item)}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void editCatalogItem(item)} className="rounded bg-amber-100 px-2 py-1 text-amber-800">Editar</button>
                  <button type="button" onClick={() => void deleteCatalogItem(item)} className="rounded bg-rose-100 px-2 py-1 text-rose-800">Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    if (view === "transacciones") {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Transacciones</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select className="rounded-lg border border-slate-300 p-2" value={transaccionForm.idCuenta} onChange={(e) => setTransaccionForm((p) => ({ ...p, idCuenta: e.target.value }))}>
              <option value="">Cuenta</option>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select className="rounded-lg border border-slate-300 p-2" value={transaccionForm.idCategoria} onChange={(e) => setTransaccionForm((p) => ({ ...p, idCategoria: e.target.value }))}>
              <option value="">Categoría</option>
              {(catalogs.categoria ?? []).map((it) => <option key={it.id} value={it.id}>{valueOfCatalog(it)}</option>)}
            </select>
            <select className="rounded-lg border border-slate-300 p-2" value={transaccionForm.idMetodoPago} onChange={(e) => setTransaccionForm((p) => ({ ...p, idMetodoPago: e.target.value }))}>
              <option value="">Método de pago</option>
              {(catalogs["metodo-pago"] ?? []).map((it) => <option key={it.id} value={it.id}>{valueOfCatalog(it)}</option>)}
            </select>
            <input className="rounded-lg border border-slate-300 p-2" type="number" step="0.01" value={transaccionForm.monto} onChange={(e) => setTransaccionForm((p) => ({ ...p, monto: e.target.value }))} placeholder="Monto" />
            <input className="rounded-lg border border-slate-300 p-2" value={transaccionForm.descripcion} onChange={(e) => setTransaccionForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción" />
            <input className="rounded-lg border border-slate-300 p-2" type="datetime-local" value={transaccionForm.fecha} onChange={(e) => setTransaccionForm((p) => ({ ...p, fecha: e.target.value }))} />
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={transaccionForm.esIngreso} onChange={(e) => setTransaccionForm((p) => ({ ...p, esIngreso: e.target.checked }))} /> Es ingreso
          </label>
          <div className="mt-3">
            <button type="button" onClick={() => void createTransaccion()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Crear transacción</button>
          </div>
          <ul className="mt-4 divide-y rounded-lg border border-slate-200">
            {transacciones.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {tx.esIngreso ? "Ingreso" : "Gasto"} · ${String(tx.monto)} · {tx.cuenta?.nombre} · {parseDateForInput(tx.fecha).replace("T", " ")}
                </span>
                <button type="button" onClick={() => void deleteTransaccion(tx.id)} className="rounded bg-rose-100 px-2 py-1 text-rose-800">Eliminar</button>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    if (view === "objetivos") {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Objetivos financieros</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className="rounded-lg border border-slate-300 p-2" placeholder="Nombre objetivo" value={objetivoForm.nombreObjetivo} onChange={(e) => setObjetivoForm((p) => ({ ...p, nombreObjetivo: e.target.value }))} />
            <select className="rounded-lg border border-slate-300 p-2" value={objetivoForm.idTipoObjetivo} onChange={(e) => setObjetivoForm((p) => ({ ...p, idTipoObjetivo: e.target.value }))}>
              <option value="">Tipo objetivo</option>
              {(catalogs["tipo-objetivo"] ?? []).map((it) => <option key={it.id} value={it.id}>{valueOfCatalog(it)}</option>)}
            </select>
            <input className="rounded-lg border border-slate-300 p-2" type="number" step="0.01" value={objetivoForm.montoMeta} onChange={(e) => setObjetivoForm((p) => ({ ...p, montoMeta: e.target.value }))} placeholder="Monto meta" />
            <input className="rounded-lg border border-slate-300 p-2" type="datetime-local" value={objetivoForm.fechaLimite} onChange={(e) => setObjetivoForm((p) => ({ ...p, fechaLimite: e.target.value }))} />
            <select className="rounded-lg border border-slate-300 p-2" value={objetivoForm.idPrioridad} onChange={(e) => setObjetivoForm((p) => ({ ...p, idPrioridad: e.target.value }))}>
              <option value="">Prioridad</option>
              {(catalogs.prioridad ?? []).map((it) => <option key={it.id} value={it.id}>{valueOfCatalog(it)}</option>)}
            </select>
            <select className="rounded-lg border border-slate-300 p-2" value={objetivoForm.idEstado} onChange={(e) => setObjetivoForm((p) => ({ ...p, idEstado: e.target.value }))}>
              <option value="">Estado</option>
              {(catalogs.estado ?? []).map((it) => <option key={it.id} value={it.id}>{valueOfCatalog(it)}</option>)}
            </select>
            <select className="rounded-lg border border-slate-300 p-2" value={objetivoForm.idCuenta} onChange={(e) => setObjetivoForm((p) => ({ ...p, idCuenta: e.target.value }))}>
              <option value="">Cuenta asociada</option>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="mt-3">
            <button type="button" onClick={() => void createObjetivo()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Crear objetivo</button>
          </div>
          <ul className="mt-4 divide-y rounded-lg border border-slate-200">
            {objetivos.map((obj) => (
              <li key={obj.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{obj.nombreObjetivo} · ${String(obj.montoMeta)} · {new Date(obj.fechaLimite).toLocaleDateString("es-CO")}</span>
                <button type="button" onClick={() => void deleteObjetivo(obj.id)} className="rounded bg-rose-100 px-2 py-1 text-rose-800">Eliminar</button>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Cuentas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="rounded-lg border border-slate-300 p-2" placeholder="Nombre cuenta" value={cuentaForm.nombre} onChange={(e) => setCuentaForm((p) => ({ ...p, nombre: e.target.value }))} />
          <select className="rounded-lg border border-slate-300 p-2" value={cuentaForm.idTipoCuenta} onChange={(e) => setCuentaForm((p) => ({ ...p, idTipoCuenta: e.target.value }))}>
            <option value="">Tipo de cuenta</option>
            {(catalogs["tipo-cuenta"] ?? []).map((it) => <option key={it.id} value={it.id}>{valueOfCatalog(it)}</option>)}
          </select>
          <input className="rounded-lg border border-slate-300 p-2" type="number" step="0.01" placeholder="Saldo" value={cuentaForm.saldoActual} onChange={(e) => setCuentaForm((p) => ({ ...p, saldoActual: e.target.value }))} />
        </div>
        <div className="mt-3">
          <button type="button" onClick={() => void createCuenta()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Crear cuenta</button>
        </div>
        <ul className="mt-4 divide-y rounded-lg border border-slate-200">
          {cuentas.map((cuenta) => (
            <li key={cuenta.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{cuenta.nombre} · {cuenta.tipoCuenta?.nombre} · ${String(cuenta.saldoActual)}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => void updateCuenta(cuenta)} className="rounded bg-amber-100 px-2 py-1 text-amber-800">Editar</button>
                <button type="button" onClick={() => void deleteCuenta(cuenta.id)} className="rounded bg-rose-100 px-2 py-1 text-rose-800">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (status === "loading") {
    return <div className="p-8 text-center">Cargando sesión...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="mx-auto mt-20 max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-center text-3xl font-bold text-slate-900">FinanceApp</h1>
          <p className="mt-3 text-center text-sm text-slate-600">
            Gestiona tus finanzas personales de manera inteligente.
          </p>
          <div className="mt-6 flex justify-center">
            <SignInButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white md:w-72 md:border-b-0 md:border-r">
          <div className="p-6">
            <h1 className="text-2xl font-black text-slate-900">FinanceApp</h1>
            <p className="text-sm text-slate-500">Gestión Financiera Personal</p>
          </div>
          <nav className="px-3 pb-4">
            <ul className="space-y-1">
              {menu.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      view === item.id
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
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
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold capitalize">{view}</h2>
              <p className="text-sm text-slate-500">{session.user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium text-slate-800">
                  {(perfil?.nombre ?? session.user?.name ?? "Usuario").toString()}
                </p>
                <p className="text-xs text-slate-500">Sesión activa</p>
              </div>
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt="avatar"
                  className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold">
                  {(perfil?.nombre ?? "U").charAt(0).toUpperCase()}
                </div>
              )}
              <SignOutButton />
            </div>
          </header>

          <main className="p-6">
            {error ? (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            {loading ? (
              <p className="mb-4 text-sm text-slate-500">Cargando información...</p>
            ) : null}
            {renderMain()}
          </main>
        </div>
      </div>
    </div>
  );
}
