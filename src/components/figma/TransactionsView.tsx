"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { fetchJson } from "./figma-api";

interface CatalogItem {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface AccountItem {
  id: number;
  nombre: string;
}

interface TransactionRecord {
  id: number;
  descripcion: string | null;
  monto: number | string;
  esIngreso: boolean;
  fecha: string;
  cuenta: AccountItem;
  categoria: CatalogItem | null;
  metodoPago: CatalogItem | null;
}

export function TransactionsView() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<CatalogItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "0",
    type: "expense" as "income" | "expense",
    category: "",
    method: "",
    account: "",
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [transactionsResponse, accountsResponse, categoriesResponse, paymentMethodsResponse] =
          await Promise.all([
            fetchJson<TransactionRecord[]>("/api/transacciones"),
            fetchJson<AccountItem[]>("/api/cuentas"),
            fetchJson<CatalogItem[]>("/api/catalogos/categoria"),
            fetchJson<CatalogItem[]>("/api/catalogos/metodo-pago"),
          ]);

        if (!active) {
          return;
        }

        setTransactions(transactionsResponse);
        setAccounts(accountsResponse);
        setCategories(categoriesResponse);
        setPaymentMethods(paymentMethodsResponse);

        setNewTransaction((current) => ({
          ...current,
          account: current.account || String(accountsResponse[0]?.id ?? ""),
          category: current.category || String(categoriesResponse[0]?.id ?? ""),
          method: current.method || String(paymentMethodsResponse[0]?.id ?? ""),
        }));
      } catch (error) {
        if (!active) {
          return;
        }

        setError(
          error instanceof Error ? error.message : "No se pudieron cargar las transacciones",
        );
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

  const totalIncome = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.esIngreso)
        .reduce((sum, transaction) => sum + Number(transaction.monto), 0),
    [transactions],
  );

  const totalExpenses = useMemo(
    () =>
      transactions
        .filter((transaction) => !transaction.esIngreso)
        .reduce((sum, transaction) => sum + Number(transaction.monto), 0),
    [transactions],
  );

  const handleAddTransaction = async () => {
    await fetchJson<TransactionRecord>("/api/transacciones", {
      method: "POST",
      body: JSON.stringify({
        idCuenta: Number(newTransaction.account),
        idCategoria: newTransaction.category ? Number(newTransaction.category) : undefined,
        idMetodoPago: newTransaction.method ? Number(newTransaction.method) : undefined,
        monto: Number(newTransaction.amount),
        descripcion: newTransaction.description || undefined,
        esIngreso: newTransaction.type === "income",
      }),
    });

    setNewTransaction({
      description: "",
      amount: "0",
      type: "expense",
      category: categories[0] ? String(categories[0].id) : "",
      method: paymentMethods[0] ? String(paymentMethods[0].id) : "",
      account: accounts[0] ? String(accounts[0].id) : "",
    });
    setIsDialogOpen(false);
    setTransactions(await fetchJson<TransactionRecord[]>("/api/transacciones"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Transacciones</h2>
          <p className="text-muted-foreground">Registra tus ingresos y gastos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva transacción
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Cargando transacciones...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Ingresos totales</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Gastos totales</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
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
                className="flex items-center justify-between border-b py-3 last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-full p-2 ${
                      transaction.esIngreso ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {transaction.esIngreso ? (
                      <ArrowDownRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p>{transaction.descripcion || "Transacción"}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.categoria?.descripcion || "Sin categoría"} • {transaction.cuenta?.nombre}
                      {transaction.metodoPago?.nombre ? ` • ${transaction.metodoPago.nombre}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={transaction.esIngreso ? "text-green-600" : "text-red-600"}>
                    {transaction.esIngreso ? "+" : "-"}
                    {formatCurrency(Number(transaction.monto))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.fecha).toLocaleDateString("es-CO")}
                  </p>
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
                  setNewTransaction({ ...newTransaction, amount: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="transaction-account">Cuenta</Label>
              <Select
                value={newTransaction.account}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, account: value })}
              >
                <SelectTrigger id="transaction-account">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transaction-category">Categoría</Label>
              <Select
                value={newTransaction.category}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
              >
                <SelectTrigger id="transaction-category">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.descripcion || category.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transaction-method">Método de pago</Label>
              <Select
                value={newTransaction.method}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, method: value })}
              >
                <SelectTrigger id="transaction-method">
                  <SelectValue placeholder="Selecciona un método" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={String(method.id)}>
                      {method.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void handleAddTransaction()} className="w-full">
              Agregar transacción
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
