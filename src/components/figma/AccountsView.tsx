"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { fetchJson } from "./figma-api";

interface CatalogItem {
  id: number;
  nombre: string;
}

interface AccountRecord {
  id: number;
  nombre: string;
  saldoActual: number | string;
  tipoCuenta: CatalogItem;
}

export function AccountsView() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountTypes, setAccountTypes] = useState<CatalogItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({
    nombre: "",
    idTipoCuenta: "",
    saldoActual: "0",
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [accountsResponse, accountTypesResponse] = await Promise.all([
          fetchJson<AccountRecord[]>("/api/cuentas"),
          fetchJson<CatalogItem[]>("/api/catalogos/tipo-cuenta"),
        ]);

        if (!active) {
          return;
        }

        setAccounts(accountsResponse);
        setAccountTypes(accountTypesResponse);

        if (!newAccount.idTipoCuenta && accountTypesResponse.length > 0) {
          setNewAccount((current) => ({
            ...current,
            idTipoCuenta: String(accountTypesResponse[0].id),
          }));
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setError(error instanceof Error ? error.message : "No se pudieron cargar las cuentas");
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

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.saldoActual), 0),
    [accounts],
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);

  const handleAddAccount = async () => {
    await fetchJson<AccountRecord>("/api/cuentas", {
      method: "POST",
      body: JSON.stringify({
        nombre: newAccount.nombre,
        idTipoCuenta: Number(newAccount.idTipoCuenta),
        saldoActual: Number(newAccount.saldoActual),
      }),
    });

    setNewAccount({
      nombre: "",
      idTipoCuenta: accountTypes[0] ? String(accountTypes[0].id) : "",
      saldoActual: "0",
    });
    setIsDialogOpen(false);

    const refreshed = await fetchJson<AccountRecord[]>("/api/cuentas");
    setAccounts(refreshed);
  };

  const handleDeleteAccount = async (id: number) => {
    await fetchJson(`/api/cuentas/${id}`, { method: "DELETE" });
    setAccounts(await fetchJson<AccountRecord[]>("/api/cuentas"));
  };

  const getAccountIcon = () => <Wallet className="h-5 w-5" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Cuentas</h2>
          <p className="text-muted-foreground">Gestiona tus cuentas bancarias</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva cuenta
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Cargando cuentas...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Balance Total</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">{account.nombre}</CardTitle>
              <div className="flex gap-2">
                {getAccountIcon()}
                <Button variant="ghost" size="sm" onClick={() => void handleDeleteAccount(account.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatCurrency(Number(account.saldoActual))}</div>
              <p className="mt-1 text-xs text-muted-foreground">{account.tipoCuenta?.nombre}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar nueva cuenta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="account-name">Nombre de la cuenta</Label>
              <Input
                id="account-name"
                value={newAccount.nombre}
                onChange={(e) => setNewAccount({ ...newAccount, nombre: e.target.value })}
                placeholder="Ej: Cuenta de Ahorros"
              />
            </div>
            <div>
              <Label htmlFor="account-type">Tipo de cuenta</Label>
              <Select
                value={newAccount.idTipoCuenta}
                onValueChange={(value) => setNewAccount({ ...newAccount, idTipoCuenta: value })}
              >
                <SelectTrigger id="account-type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="account-balance">Balance inicial</Label>
              <Input
                id="account-balance"
                type="number"
                value={newAccount.saldoActual}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, saldoActual: e.target.value })
                }
              />
            </div>
            <Button onClick={() => void handleAddAccount()} className="w-full">
              Agregar cuenta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
