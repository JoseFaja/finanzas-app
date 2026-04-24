import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export function AccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([
    { id: "1", name: "Cuenta Corriente", type: "checking", balance: 5420000, currency: "COP" },
    { id: "2", name: "Cuenta de Ahorros", type: "savings", balance: 12500000, currency: "COP" },
    { id: "3", name: "Tarjeta de Crédito", type: "credit", balance: -850000, currency: "COP" },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "checking",
    balance: 0,
    currency: "COP",
  });

  const handleAddAccount = () => {
    setAccounts([
      ...accounts,
      {
        id: Date.now().toString(),
        ...newAccount,
      },
    ]);
    setNewAccount({ name: "", type: "checking", balance: 0, currency: "COP" });
    setIsDialogOpen(false);
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(accounts.filter((acc) => acc.id !== id));
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountIcon = (type: string) => {
    return <Wallet className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Cuentas</h2>
          <p className="text-muted-foreground">Gestiona tus cuentas bancarias</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva cuenta
        </Button>
      </div>

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
              <CardTitle className="text-sm">{account.name}</CardTitle>
              <div className="flex gap-2">
                {getAccountIcon(account.type)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAccount(account.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {formatCurrency(account.balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {account.type === "checking" && "Cuenta Corriente"}
                {account.type === "savings" && "Cuenta de Ahorros"}
                {account.type === "credit" && "Tarjeta de Crédito"}
              </p>
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
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="Ej: Cuenta de Ahorros"
              />
            </div>
            <div>
              <Label htmlFor="account-type">Tipo de cuenta</Label>
              <Select
                value={newAccount.type}
                onValueChange={(value) => setNewAccount({ ...newAccount, type: value })}
              >
                <SelectTrigger id="account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Cuenta Corriente</SelectItem>
                  <SelectItem value="savings">Cuenta de Ahorros</SelectItem>
                  <SelectItem value="credit">Tarjeta de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="account-balance">Balance inicial</Label>
              <Input
                id="account-balance"
                type="number"
                value={newAccount.balance}
                onChange={(e) => setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <Button onClick={handleAddAccount} className="w-full">
              Agregar cuenta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
