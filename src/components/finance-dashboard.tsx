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
  metodoPago?: { id: number; nombre: string } | null;
};

type Objetivo = {
  id: number;
  nombreObjetivo: string;
  montoMeta: string | number;
  fechaLimite: string;
  tipoObjetivo?: { id: number; nombre: string };
  prioridad?: { id: number; nombre: string } | null;
  estado?: { id: number; nombre: string } | null;
  cuenta?: { id: number; nombre: string } | null;
};

type Perfil = {
  id: number;
  nombre?: string | null;
  apellido?: string | null;
  correo: string;
  numeroDocumento?: string | null;
  idTipoDocumento?: number | null;
  idEstado?: number | null;
  googleImage?: string | null;
};

const catalogEntities = [
  { id: "tipo-cuenta", label: "Tipo de cuenta" },
  { id: "categoria", label: "Categoría" },
  { id: "metodo-pago", label: "Método de pago" },
  { id: "tipo-objetivo", label: "Tipo de objetivo" },
  { id: "prioridad", label: "Prioridad" },
  { id: "estado", label: "Estado" },
  { id: "tipo-documento", label: "Tipo documento" },
] as const;

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

export function FinanceDashboard() {
  const { data: session, status } = useSession();

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

  if (status === "loading") {
    return <div className="p-8 text-center">Cargando sesión...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_55%)] p-6">
        <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-slate-900">Finanzas App</h1>
          <p className="mt-3 text-slate-600">
            Inicia sesión con Google para gestionar tu perfil y CRUD financiero.
          </p>
          <div className="mt-6">
            <SignInButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f3ff,_#f8fafc_65%)] p-6 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Panel de Gestión Financiera
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Sesión activa: {session.user?.email}
              </p>
            </div>
            <SignOutButton />
          </div>
          {error ? (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Cargando datos...</p>
          ) : null}
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
            <h2 className="text-xl font-bold">Perfil</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-slate-300 p-2"
                placeholder="Nombre"
                value={perfilForm.nombre}
                onChange={(e) =>
                  setPerfilForm((p) => ({ ...p, nombre: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 p-2"
                placeholder="Apellido"
                value={perfilForm.apellido}
                onChange={(e) =>
                  setPerfilForm((p) => ({ ...p, apellido: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 p-2"
                placeholder="Documento"
                value={perfilForm.numeroDocumento}
                onChange={(e) =>
                  setPerfilForm((p) => ({ ...p, numeroDocumento: e.target.value }))
                }
              />
              <select
                className="rounded-lg border border-slate-300 p-2"
                value={perfilForm.idTipoDocumento}
                onChange={(e) =>
                  setPerfilForm((p) => ({ ...p, idTipoDocumento: e.target.value }))
                }
              >
                <option value="">Tipo documento</option>
                {(catalogs["tipo-documento"] ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {valueOfCatalog(it)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-slate-300 p-2"
                value={perfilForm.idEstado}
                onChange={(e) =>
                  setPerfilForm((p) => ({ ...p, idEstado: e.target.value }))
                }
              >
                <option value="">Estado</option>
                {(catalogs.estado ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {valueOfCatalog(it)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void savePerfil()}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Guardar perfil
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Correo autenticado: {perfil?.correo ?? session.user?.email}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
            <h2 className="text-xl font-bold">Catálogos</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-slate-300 p-2"
                value={catalogEntity}
                onChange={(e) => {
                  setCatalogEntity(e.target.value);
                  void loadCatalog(e.target.value);
                }}
              >
                {catalogEntities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
              <input
                className="min-w-[220px] flex-1 rounded-lg border border-slate-300 p-2"
                placeholder="Nuevo valor"
                value={catalogNewValue}
                onChange={(e) => setCatalogNewValue(e.target.value)}
              />
              <button
                type="button"
                onClick={() => void createCatalogItem()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Agregar
              </button>
            </div>
            <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-slate-200">
              {currentCatalog.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">Sin datos</p>
              ) : (
                <ul>
                  {currentCatalog.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm"
                    >
                      <span>
                        {item.id}. {valueOfCatalog(item)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded bg-amber-100 px-2 py-1 text-amber-800"
                          onClick={() => void editCatalogItem(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded bg-rose-100 px-2 py-1 text-rose-800"
                          onClick={() => void deleteCatalogItem(item)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
            <h2 className="text-xl font-bold">Cuentas</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                className="rounded-lg border border-slate-300 p-2"
                placeholder="Nombre cuenta"
                value={cuentaForm.nombre}
                onChange={(e) =>
                  setCuentaForm((p) => ({ ...p, nombre: e.target.value }))
                }
              />
              <select
                className="rounded-lg border border-slate-300 p-2"
                value={cuentaForm.idTipoCuenta}
                onChange={(e) =>
                  setCuentaForm((p) => ({ ...p, idTipoCuenta: e.target.value }))
                }
              >
                <option value="">Tipo de cuenta</option>
                {(catalogs["tipo-cuenta"] ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {valueOfCatalog(it)}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-slate-300 p-2"
                type="number"
                step="0.01"
                placeholder="Saldo"
                value={cuentaForm.saldoActual}
                onChange={(e) =>
                  setCuentaForm((p) => ({ ...p, saldoActual: e.target.value }))
                }
              />
            </div>
            <button
              type="button"
              onClick={() => void createCuenta()}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Crear cuenta
            </button>
            <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-slate-200">
              <ul>
                {cuentas.map((cuenta) => (
                  <li
                    key={cuenta.id}
                    className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm"
                  >
                    <span>
                      {cuenta.nombre} · {cuenta.tipoCuenta?.nombre} · ${String(cuenta.saldoActual)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded bg-amber-100 px-2 py-1 text-amber-800"
                        onClick={() => void updateCuenta(cuenta)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded bg-rose-100 px-2 py-1 text-rose-800"
                        onClick={() => void deleteCuenta(cuenta.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
            <h2 className="text-xl font-bold">Transacciones</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-lg border border-slate-300 p-2"
                value={transaccionForm.idCuenta}
                onChange={(e) =>
                  setTransaccionForm((p) => ({ ...p, idCuenta: e.target.value }))
                }
              >
                <option value="">Cuenta</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-slate-300 p-2"
                value={transaccionForm.idCategoria}
                onChange={(e) =>
                  setTransaccionForm((p) => ({ ...p, idCategoria: e.target.value }))
                }
              >
                <option value="">Categoría</option>
                {(catalogs.categoria ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {valueOfCatalog(it)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-slate-300 p-2"
                value={transaccionForm.idMetodoPago}
                onChange={(e) =>
                  setTransaccionForm((p) => ({ ...p, idMetodoPago: e.target.value }))
                }
              >
                <option value="">Método de pago</option>
                {(catalogs["metodo-pago"] ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {valueOfCatalog(it)}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-slate-300 p-2"
                type="number"
                step="0.01"
                placeholder="Monto"
                value={transaccionForm.monto}
                onChange={(e) =>
                  setTransaccionForm((p) => ({ ...p, monto: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 p-2"
                placeholder="Descripción"
                value={transaccionForm.descripcion}
                onChange={(e) =>
                  setTransaccionForm((p) => ({ ...p, descripcion: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 p-2"
                type="datetime-local"
                value={transaccionForm.fecha}
                onChange={(e) =>
                  setTransaccionForm((p) => ({ ...p, fecha: e.target.value }))
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={transaccionForm.esIngreso}
                  onChange={(e) =>
                    setTransaccionForm((p) => ({ ...p, esIngreso: e.target.checked }))
                  }
                />
                Es ingreso
              </label>
            </div>
            <button
              type="button"
              onClick={() => void createTransaccion()}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Crear transacción
            </button>
            <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-slate-200">
              <ul>
                {transacciones.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm"
                  >
                    <span>
                      {tx.esIngreso ? "Ingreso" : "Gasto"} · ${String(tx.monto)} · {tx.cuenta?.nombre}
                    </span>
                    <button
                      type="button"
                      className="rounded bg-rose-100 px-2 py-1 text-rose-800"
                      onClick={() => void deleteTransaccion(tx.id)}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <h2 className="text-xl font-bold">Objetivos financieros</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              className="rounded-lg border border-slate-300 p-2"
              placeholder="Nombre objetivo"
              value={objetivoForm.nombreObjetivo}
              onChange={(e) =>
                setObjetivoForm((p) => ({ ...p, nombreObjetivo: e.target.value }))
              }
            />
            <select
              className="rounded-lg border border-slate-300 p-2"
              value={objetivoForm.idTipoObjetivo}
              onChange={(e) =>
                setObjetivoForm((p) => ({ ...p, idTipoObjetivo: e.target.value }))
              }
            >
              <option value="">Tipo objetivo</option>
              {(catalogs["tipo-objetivo"] ?? []).map((it) => (
                <option key={it.id} value={it.id}>
                  {valueOfCatalog(it)}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-slate-300 p-2"
              type="number"
              step="0.01"
              placeholder="Monto meta"
              value={objetivoForm.montoMeta}
              onChange={(e) =>
                setObjetivoForm((p) => ({ ...p, montoMeta: e.target.value }))
              }
            />
            <input
              className="rounded-lg border border-slate-300 p-2"
              type="datetime-local"
              value={objetivoForm.fechaLimite}
              onChange={(e) =>
                setObjetivoForm((p) => ({ ...p, fechaLimite: e.target.value }))
              }
            />
            <select
              className="rounded-lg border border-slate-300 p-2"
              value={objetivoForm.idPrioridad}
              onChange={(e) =>
                setObjetivoForm((p) => ({ ...p, idPrioridad: e.target.value }))
              }
            >
              <option value="">Prioridad</option>
              {(catalogs.prioridad ?? []).map((it) => (
                <option key={it.id} value={it.id}>
                  {valueOfCatalog(it)}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-300 p-2"
              value={objetivoForm.idEstado}
              onChange={(e) =>
                setObjetivoForm((p) => ({ ...p, idEstado: e.target.value }))
              }
            >
              <option value="">Estado</option>
              {(catalogs.estado ?? []).map((it) => (
                <option key={it.id} value={it.id}>
                  {valueOfCatalog(it)}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-300 p-2"
              value={objetivoForm.idCuenta}
              onChange={(e) =>
                setObjetivoForm((p) => ({ ...p, idCuenta: e.target.value }))
              }
            >
              <option value="">Cuenta asociada</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void createObjetivo()}
            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Crear objetivo
          </button>
          <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-slate-200">
            <ul>
              {objetivos.map((obj) => (
                <li
                  key={obj.id}
                  className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm"
                >
                  <span>
                    {obj.nombreObjetivo} · ${String(obj.montoMeta)} ·
                    {" "}
                    {new Date(obj.fechaLimite).toLocaleDateString("es-CO")}
                  </span>
                  <button
                    type="button"
                    className="rounded bg-rose-100 px-2 py-1 text-rose-800"
                    onClick={() => void deleteObjetivo(obj.id)}
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
