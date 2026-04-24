import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  account: string;
}

export function TransactionsView() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", description: "Salario", amount: 4500000, type: "income", category: "Salario", date: "2026-04-01", account: "Cuenta Corriente" },
    { id: "2", description: "Supermercado", amount: 250000, type: "expense", category: "Alimentación", date: "2026-04-05", account: "Cuenta Corriente" },
    { id: "3", description: "Servicios públicos", amount: 180000, type: "expense", category: "Hogar", date: "2026-04-10", account: "Cuenta Corriente" },
    { id: "4", description: "Freelance proyecto", amount: 1200000, type: "income", category: "Ingresos extra", date: "2026-04-15", account: "Cuenta de Ahorros" },
    { id: "5", description: "Gimnasio", amount: 120000, type: "expense", category: "Salud", date: "2026-04-20", account: "Tarjeta de Crédito" },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: 0,
    type: "expense" as "income" | "expense",
    category: "Otros",
    account: "Cuenta Corriente",
  });

  const handleAddTransaction = () => {
    setTransactions([
      {
        id: Date.now().toString(),
        ...newTransaction,
        date: new Date().toISOString().split("T")[0],
      },
      ...transactions,
    ]);
    setNewTransaction({
      description: "",
      amount: 0,
      type: "expense",
      category: "Otros",
      account: "Cuenta Corriente",
    });
    setIsDialogOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Transacciones</h2>
          <p className="text-muted-foreground">Registra tus ingresos y gastos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva transacción
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Ingresos totales</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Gastos totales</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-3 border-b last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === "income" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowDownRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p>{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.category} • {transaction.account}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={
                      transaction.type === "income" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-sm text-muted-foreground">{transaction.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar transacción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="transaction-type">Tipo</Label>
              <Select
                value={newTransaction.type}
                onValueChange={(value: "income" | "expense") =>
                  setNewTransaction({ ...newTransaction, type: value })
                }
              >
                <SelectTrigger id="transaction-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transaction-description">Descripción</Label>
              <Input
                id="transaction-description"
                value={newTransaction.description}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, description: e.target.value })
                }
                placeholder="Ej: Salario mensual"
              />
            </div>
            <div>
              <Label htmlFor="transaction-amount">Monto</Label>
              <Input
                id="transaction-amount"
                type="number"
                value={newTransaction.amount}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="transaction-category">Categoría</Label>
              <Select
                value={newTransaction.category}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
              >
                <SelectTrigger id="transaction-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salario">Salario</SelectItem>
                  <SelectItem value="Ingresos extra">Ingresos extra</SelectItem>
                  <SelectItem value="Alimentación">Alimentación</SelectItem>
                  <SelectItem value="Hogar">Hogar</SelectItem>
                  <SelectItem value="Transporte">Transporte</SelectItem>
                  <SelectItem value="Salud">Salud</SelectItem>
                  <SelectItem value="Entretenimiento">Entretenimiento</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transaction-account">Cuenta</Label>
              <Select
                value={newTransaction.account}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, account: value })}
              >
                <SelectTrigger id="transaction-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                  <SelectItem value="Cuenta de Ahorros">Cuenta de Ahorros</SelectItem>
                  <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddTransaction} className="w-full">
              Agregar transacción
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
