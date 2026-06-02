"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, Trash2, CreditCard, Pencil } from "lucide-react";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { fetchJson } from "./figma-api";

interface CatalogItem {
  id: number;
  nombre: string;
}

interface DebtRecord {
  id: number;
  montoTotal: number | string;
  saldoPendiente: number | string;
  tasaIntereses: number | string;
  cuotas: number;
  cuotasPagadas: number;
  montoPagado?: number;
  progresoPago?: number;
  pagoMensualEstimado?: number;
  totalConInteresesEstimado?: number;
  tipoDeuda: CatalogItem;
  frecuenciaPago: CatalogItem | null;
}

interface DebtFormState {
  typeName: string;
  montoTotal: string;
  saldoPendiente: string;
  tasaIntereses: string;
  cuotas: string;
  cuotasPagadas: string;
  idFrecuenciaPago: string;
}

function calculatePaymentProgress(debt: DebtRecord) {
  const total = Number(debt.montoTotal);
  const pending = Number(debt.saldoPendiente);

  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  const paid = Math.max(total - pending, 0);

  return Math.min((paid / total) * 100, 100);
}

function calculateEstimatedMonthlyPayment(debt: DebtRecord) {
  if (typeof debt.pagoMensualEstimado === "number") {
    return debt.pagoMensualEstimado;
  }

  const principal = Number(debt.saldoPendiente);
  const remainingInstallments = Math.max(debt.cuotas - debt.cuotasPagadas, 1);
  const monthlyRate = Number(debt.tasaIntereses) / 100;

  if (!Number.isFinite(principal) || principal <= 0) {
    return 0;
  }

  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) {
    return principal / remainingInstallments;
  }

  const factor = Math.pow(1 + monthlyRate, remainingInstallments);

  return (principal * monthlyRate * factor) / (factor - 1);
}

function formatProgress(value: number) {
  if (value > 0 && value < 0.01) {
    return "<0.01%";
  }

  if (value > 0 && value < 1) {
    return `${value.toFixed(2)}%`;
  }

  return `${value.toFixed(1)}%`;
}

function getProgressBarValue(value: number) {
  if (value > 0 && value < 2) {
    return 2;
  }

  return value;
}

export function DebtsView() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [debtTypes, setDebtTypes] = useState<CatalogItem[]>([]);
  const [paymentFrequencies, setPaymentFrequencies] = useState<CatalogItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDebt, setNewDebt] = useState<DebtFormState>({
    typeName: "",
    montoTotal: "0",
    saldoPendiente: "0",
    tasaIntereses: "0",
    cuotas: "12",
    cuotasPagadas: "0",
    idFrecuenciaPago: "",
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [debtsResponse, debtTypesResponse, paymentFrequenciesResponse] = await Promise.all([
          fetchJson<DebtRecord[]>("/api/deudas"),
          fetchJson<CatalogItem[]>("/api/catalogos/tipo-deuda"),
          fetchJson<CatalogItem[]>("/api/catalogos/frecuencia-pago"),
        ]);

        if (!active) {
          return;
        }

        setDebts(debtsResponse);
        setDebtTypes(debtTypesResponse);
        setPaymentFrequencies(paymentFrequenciesResponse);
        setNewDebt((current) => ({
          ...current,
          typeName: current.typeName || debtTypesResponse[0]?.nombre || "",
          idFrecuenciaPago: current.idFrecuenciaPago || String(paymentFrequenciesResponse[0]?.id ?? ""),
        }));
      } catch (error) {
        if (!active) {
          return;
        }

        setError(error instanceof Error ? error.message : "No se pudieron cargar las deudas");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);

  const totalDebt = useMemo(
    () => debts.reduce((sum, debt) => sum + Number(debt.saldoPendiente), 0),
    [debts],
  );

  const totalMonthlyPayment = useMemo(
    () => debts.reduce((sum, debt) => sum + calculateEstimatedMonthlyPayment(debt), 0),
    [debts],
  );

  const formEstimatedMonthlyPayment = useMemo(
    () =>
      calculateEstimatedMonthlyPayment({
        id: 0,
        montoTotal: Number(newDebt.montoTotal),
        saldoPendiente: Number(newDebt.saldoPendiente),
        tasaIntereses: Number(newDebt.tasaIntereses),
        cuotas: Number(newDebt.cuotas),
        cuotasPagadas: Number(newDebt.cuotasPagadas),
        tipoDeuda: { id: 0, nombre: newDebt.typeName },
        frecuenciaPago: null,
      }),
    [newDebt],
  );

  const normalizeText = (value: string) => value.trim().toLowerCase();

  const resolveDebtTypeId = async (typeName: string) => {
    const cleanName = typeName.trim();

    if (!cleanName) {
      throw new Error("Debes escribir el tipo de deuda");
    }

    const existingType = debtTypes.find((item) => normalizeText(item.nombre) === normalizeText(cleanName));

    if (existingType) {
      return existingType.id;
    }

    const createdType = await fetchJson<CatalogItem>("/api/catalogos/tipo-deuda", {
      method: "POST",
      body: JSON.stringify({ nombre: cleanName }),
    });

    setDebtTypes((current) => [...current, createdType]);
    return createdType.id;
  };

  const refreshDebts = async () => {
    const refreshedDebts = await fetchJson<DebtRecord[]>("/api/deudas");
    setDebts(refreshedDebts);
  };

  const openCreateDialog = () => {
    setEditingDebt(null);
    setError(null);
    setNewDebt({
      typeName: debtTypes[0]?.nombre || "",
      montoTotal: "0",
      saldoPendiente: "0",
      tasaIntereses: "0",
      cuotas: "12",
      cuotasPagadas: "0",
      idFrecuenciaPago: paymentFrequencies[0] ? String(paymentFrequencies[0].id) : "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (debt: DebtRecord) => {
    setEditingDebt(debt);
    setNewDebt({
      typeName: debt.tipoDeuda?.nombre || "",
      montoTotal: String(debt.montoTotal),
      saldoPendiente: String(debt.saldoPendiente),
      tasaIntereses: String(debt.tasaIntereses),
      cuotas: String(debt.cuotas),
      cuotasPagadas: String(debt.cuotasPagadas),
      idFrecuenciaPago: debt.frecuenciaPago ? String(debt.frecuenciaPago.id) : "",
    });
    setIsDialogOpen(true);
  };

  const handleSaveDebt = async () => {
    try {
      setError(null);
      setLoading(true);

      const idTipoDeuda = await resolveDebtTypeId(newDebt.typeName);
      const saldoPendiente = Number(newDebt.saldoPendiente);

      if (!Number.isFinite(saldoPendiente) || saldoPendiente <= 0) {
        throw new Error("El monto pendiente debe ser mayor a 0");
      }

      const payload = {
        idTipoDeuda,
        montoTotal: Number(newDebt.montoTotal),
        saldoPendiente,
        tasaIntereses: Number(newDebt.tasaIntereses),
        cuotas: Number(newDebt.cuotas),
        cuotasPagadas: Number(newDebt.cuotasPagadas),
        idFrecuenciaPago: newDebt.idFrecuenciaPago ? Number(newDebt.idFrecuenciaPago) : undefined,
      };

      if (editingDebt) {
        await fetchJson<DebtRecord>(`/api/deudas/${editingDebt.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson<DebtRecord>("/api/deudas", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setNewDebt({
        typeName: debtTypes[0]?.nombre || "",
        montoTotal: "0",
        saldoPendiente: "0",
        tasaIntereses: "0",
        cuotas: "12",
        cuotasPagadas: "0",
        idFrecuenciaPago: paymentFrequencies[0] ? String(paymentFrequencies[0].id) : "",
      });
      setEditingDebt(null);
      setIsDialogOpen(false);
      await refreshDebts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDebt = async (id: number) => {
    try {
      setError(null);
      setLoading(true);
      await fetchJson(`/api/deudas/${id}`, { method: "DELETE" });
      await refreshDebts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Deudas</h2>
          <p className="text-muted-foreground">Administra tus préstamos y deudas</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva deuda
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Cargando deudas...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deuda Total Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-red-600">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pago Mensual Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl">{formatCurrency(totalMonthlyPayment)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {debts.map((debt) => {
          const progress =
            typeof debt.progresoPago === "number" ? debt.progresoPago : calculatePaymentProgress(debt);
          const remaining = Number(debt.saldoPendiente);
          const estimatedMonthlyPayment = calculateEstimatedMonthlyPayment(debt);
          const paidAmount =
            typeof debt.montoPagado === "number"
              ? debt.montoPagado
              : Math.max(Number(debt.montoTotal) - Number(debt.saldoPendiente), 0);
          const remainingInstallments = Math.max(debt.cuotas - debt.cuotasPagadas, 0);
          const totalWithInterest =
            typeof debt.totalConInteresesEstimado === "number"
              ? debt.totalConInteresesEstimado
              : estimatedMonthlyPayment * remainingInstallments;

          return (
            <Card key={debt.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <CardTitle>{debt.tipoDeuda?.nombre}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(debt)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void handleDeleteDebt(debt.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso de pago</span>
                    <span>{formatProgress(progress)}</span>
                  </div>
                  <Progress value={getProgressBarValue(progress)} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Monto total</p>
                    <p>{formatCurrency(Number(debt.montoTotal))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pendiente</p>
                    <p className="text-red-600">{formatCurrency(remaining)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pagado</p>
                    <p className="text-green-600">{formatCurrency(paidAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pago mensual estimado</p>
                    <p>{formatCurrency(estimatedMonthlyPayment)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total estimado con intereses</p>
                    <p>{formatCurrency(totalWithInterest)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tasa de interés</p>
                    <p>{Number(debt.tasaIntereses).toFixed(2)}% mensual</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cuotas</p>
                    <p>{debt.cuotasPagadas}/{debt.cuotas}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frecuencia</p>
                    <p>{debt.frecuenciaPago?.nombre || "Sin frecuencia"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDebt ? "Editar deuda" : "Agregar nueva deuda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="debt-type">Tipo de deuda</Label>
              <Input
                id="debt-type"
                value={newDebt.typeName}
                onChange={(e) => setNewDebt({ ...newDebt, typeName: e.target.value })}
                placeholder="Escribe el tipo de deuda"
              />
            </div>
            <div>
              <Label htmlFor="debt-frequency">Frecuencia de pago</Label>
              <Select
                value={newDebt.idFrecuenciaPago}
                onValueChange={(value) => setNewDebt({ ...newDebt, idFrecuenciaPago: value })}
              >
                <SelectTrigger id="debt-frequency">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {paymentFrequencies.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="debt-total">Monto total</Label>
              <Input
                id="debt-total"
                type="number"
                value={newDebt.montoTotal}
                onChange={(e) => setNewDebt({ ...newDebt, montoTotal: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="debt-pending">Monto pendiente</Label>
              <Input
                id="debt-pending"
                type="number"
                min="1"
                value={newDebt.saldoPendiente}
                onChange={(e) => setNewDebt({ ...newDebt, saldoPendiente: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="debt-interest">Tasa de interés mensual (%)</Label>
              <Input
                id="debt-interest"
                type="number"
                step="0.1"
                value={newDebt.tasaIntereses}
                onChange={(e) => setNewDebt({ ...newDebt, tasaIntereses: e.target.value })}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pago mensual estimado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl">{formatCurrency(formEstimatedMonthlyPayment)}</p>
              </CardContent>
            </Card>
            <div>
              <Label htmlFor="debt-installments">Cuotas</Label>
              <Input
                id="debt-installments"
                type="number"
                value={newDebt.cuotas}
                onChange={(e) => setNewDebt({ ...newDebt, cuotas: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="debt-paid-installments">Cuotas pagadas</Label>
              <Input
                id="debt-paid-installments"
                type="number"
                value={newDebt.cuotasPagadas}
                onChange={(e) => setNewDebt({ ...newDebt, cuotasPagadas: e.target.value })}
              />
            </div>
            <Button onClick={() => void handleSaveDebt()} className="w-full">
              {editingDebt ? "Guardar cambios" : "Agregar deuda"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
