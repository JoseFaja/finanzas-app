"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, Trash2, CreditCard } from "lucide-react";
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
  tipoDeuda: CatalogItem;
  frecuenciaPago: CatalogItem | null;
}

export function DebtsView() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [debtTypes, setDebtTypes] = useState<CatalogItem[]>([]);
  const [paymentFrequencies, setPaymentFrequencies] = useState<CatalogItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDebt, setNewDebt] = useState({
    idTipoDeuda: "",
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
          idTipoDeuda: current.idTipoDeuda || String(debtTypesResponse[0]?.id ?? ""),
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
    () =>
      debts.reduce(
        (sum, debt) => sum + (Number(debt.montoTotal) - Number(debt.saldoPendiente)),
        0,
      ),
    [debts],
  );

  const totalMonthlyPayment = useMemo(
    () =>
      debts.reduce((sum, debt) => {
        const remainingInstallments = Math.max(debt.cuotas - debt.cuotasPagadas, 1);
        return sum + Number(debt.saldoPendiente) / remainingInstallments;
      }, 0),
    [debts],
  );

  const handleAddDebt = async () => {
    await fetchJson<DebtRecord>("/api/deudas", {
      method: "POST",
      body: JSON.stringify({
        idTipoDeuda: Number(newDebt.idTipoDeuda),
        montoTotal: Number(newDebt.montoTotal),
        saldoPendiente: Number(newDebt.saldoPendiente),
        tasaIntereses: Number(newDebt.tasaIntereses),
        cuotas: Number(newDebt.cuotas),
        cuotasPagadas: Number(newDebt.cuotasPagadas),
        idFrecuenciaPago: newDebt.idFrecuenciaPago ? Number(newDebt.idFrecuenciaPago) : undefined,
      }),
    });

    setNewDebt({
      idTipoDeuda: debtTypes[0] ? String(debtTypes[0].id) : "",
      montoTotal: "0",
      saldoPendiente: "0",
      tasaIntereses: "0",
      cuotas: "12",
      cuotasPagadas: "0",
      idFrecuenciaPago: paymentFrequencies[0] ? String(paymentFrequencies[0].id) : "",
    });
    setIsDialogOpen(false);
    setDebts(await fetchJson<DebtRecord[]>("/api/deudas"));
  };

  const handleDeleteDebt = async (id: number) => {
    await fetchJson(`/api/deudas/${id}`, { method: "DELETE" });
    setDebts(await fetchJson<DebtRecord[]>("/api/deudas"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Deudas</h2>
          <p className="text-muted-foreground">Administra tus préstamos y deudas</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
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
          const progress = (debt.cuotasPagadas / debt.cuotas) * 100;
          const remaining = Number(debt.saldoPendiente);
          const remainingInstallments = Math.max(debt.cuotas - debt.cuotasPagadas, 1);
          const estimatedMonthlyPayment = remaining / remainingInstallments;

          return (
            <Card key={debt.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <CardTitle>{debt.tipoDeuda?.nombre}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void handleDeleteDebt(debt.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso de pago</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={progress} />
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
                    <p className="text-muted-foreground">Pago mensual estimado</p>
                    <p>{formatCurrency(estimatedMonthlyPayment)}</p>
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
            <DialogTitle>Agregar nueva deuda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="debt-type">Tipo de deuda</Label>
              <Select
                value={newDebt.idTipoDeuda}
                onValueChange={(value) => setNewDebt({ ...newDebt, idTipoDeuda: value })}
              >
                <SelectTrigger id="debt-type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {debtTypes.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                onChange={(e) =>
                  setNewDebt({ ...newDebt, montoTotal: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="debt-pending">Monto pendiente</Label>
              <Input
                id="debt-pending"
                type="number"
                value={newDebt.saldoPendiente}
                onChange={(e) =>
                  setNewDebt({ ...newDebt, saldoPendiente: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="debt-interest">Tasa de interés mensual (%)</Label>
              <Input
                id="debt-interest"
                type="number"
                step="0.1"
                value={newDebt.tasaIntereses}
                onChange={(e) =>
                  setNewDebt({ ...newDebt, tasaIntereses: e.target.value })
                }
              />
            </div>
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
                onChange={(e) =>
                  setNewDebt({ ...newDebt, cuotasPagadas: e.target.value })
                }
              />
            </div>
            <Button onClick={() => void handleAddDebt()} className="w-full">
              Agregar deuda
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
