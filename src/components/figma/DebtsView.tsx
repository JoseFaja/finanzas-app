import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { Progress } from "./ui/progress";

interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  interestRate: number;
  monthlyPayment: number;
  dueDate: string;
}

export function DebtsView() {
  const [debts, setDebts] = useState<Debt[]>([
    {
      id: "1",
      name: "Préstamo Vehículo",
      totalAmount: 25000000,
      paidAmount: 8000000,
      interestRate: 1.2,
      monthlyPayment: 850000,
      dueDate: "2028-04-15",
    },
    {
      id: "2",
      name: "Tarjeta de Crédito",
      totalAmount: 3500000,
      paidAmount: 1200000,
      interestRate: 2.5,
      monthlyPayment: 450000,
      dueDate: "2027-12-01",
    },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({
    name: "",
    totalAmount: 0,
    paidAmount: 0,
    interestRate: 0,
    monthlyPayment: 0,
    dueDate: "",
  });

  const handleAddDebt = () => {
    setDebts([
      ...debts,
      {
        id: Date.now().toString(),
        ...newDebt,
      },
    ]);
    setNewDebt({
      name: "",
      totalAmount: 0,
      paidAmount: 0,
      interestRate: 0,
      monthlyPayment: 0,
      dueDate: "",
    });
    setIsDialogOpen(false);
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter((debt) => debt.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalDebt = debts.reduce((sum, debt) => sum + (debt.totalAmount - debt.paidAmount), 0);
  const totalMonthlyPayment = debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Deudas</h2>
          <p className="text-muted-foreground">Administra tus préstamos y deudas</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva deuda
        </Button>
      </div>

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
          const progress = (debt.paidAmount / debt.totalAmount) * 100;
          const remaining = debt.totalAmount - debt.paidAmount;

          return (
            <Card key={debt.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5" />
                    <CardTitle>{debt.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDebt(debt.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
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
                    <p>{formatCurrency(debt.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pendiente</p>
                    <p className="text-red-600">{formatCurrency(remaining)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pago mensual</p>
                    <p>{formatCurrency(debt.monthlyPayment)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tasa de interés</p>
                    <p>{debt.interestRate}% mensual</p>
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
              <Label htmlFor="debt-name">Nombre de la deuda</Label>
              <Input
                id="debt-name"
                value={newDebt.name}
                onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                placeholder="Ej: Préstamo Hipotecario"
              />
            </div>
            <div>
              <Label htmlFor="debt-total">Monto total</Label>
              <Input
                id="debt-total"
                type="number"
                value={newDebt.totalAmount}
                onChange={(e) =>
                  setNewDebt({ ...newDebt, totalAmount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="debt-paid">Monto pagado</Label>
              <Input
                id="debt-paid"
                type="number"
                value={newDebt.paidAmount}
                onChange={(e) =>
                  setNewDebt({ ...newDebt, paidAmount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="debt-interest">Tasa de interés mensual (%)</Label>
              <Input
                id="debt-interest"
                type="number"
                step="0.1"
                value={newDebt.interestRate}
                onChange={(e) =>
                  setNewDebt({ ...newDebt, interestRate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="debt-payment">Pago mensual</Label>
              <Input
                id="debt-payment"
                type="number"
                value={newDebt.monthlyPayment}
                onChange={(e) =>
                  setNewDebt({ ...newDebt, monthlyPayment: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="debt-duedate">Fecha de vencimiento</Label>
              <Input
                id="debt-duedate"
                type="date"
                value={newDebt.dueDate}
                onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
              />
            </div>
            <Button onClick={handleAddDebt} className="w-full">
              Agregar deuda
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
