"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Target, TrendingUp, Zap, Clock } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { fetchJson } from "./figma-api";

interface CatalogItem {
  id: number;
  nombre: string;
}

interface AccountItem {
  id: number;
  nombre: string;
  saldoActual: number | string;
}

interface GoalRecord {
  id: number;
  nombreObjetivo: string;
  montoMeta: number | string;
  fechaLimite: string;
  idTipoObjetivo: number;
  idPrioridad: number | null;
  idEstado: number | null;
  idCuenta: number | null;
  tipoObjetivo: CatalogItem;
  prioridad: CatalogItem | null;
  estado: CatalogItem | null;
  cuenta: CatalogItem | null;
}

interface Strategy {
  name: string;
  icon: typeof Zap | typeof TrendingUp | typeof Clock;
  color: string;
  monthlyPayment: number;
  timeToGoal: number;
  description: string;
  actions: string[];
}

export function GoalsView() {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [goalTypes, setGoalTypes] = useState<CatalogItem[]>([]);
  const [priorities, setPriorities] = useState<CatalogItem[]>([]);
  const [states, setStates] = useState<CatalogItem[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({
    nombreObjetivo: "",
    idTipoObjetivo: "",
    montoMeta: "0",
    fechaLimite: "",
    idPrioridad: "",
    idCuenta: "",
    idEstado: "",
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [goalsResponse, accountsResponse, goalTypesResponse, prioritiesResponse, statesResponse] =
          await Promise.all([
            fetchJson<GoalRecord[]>("/api/objetivos"),
            fetchJson<AccountItem[]>("/api/cuentas"),
            fetchJson<CatalogItem[]>("/api/catalogos/tipo-objetivo"),
            fetchJson<CatalogItem[]>("/api/catalogos/prioridad"),
            fetchJson<CatalogItem[]>("/api/catalogos/estado"),
          ]);

        if (!active) {
          return;
        }

        setGoals(goalsResponse);
        setAccounts(accountsResponse);
        setGoalTypes(goalTypesResponse);
        setPriorities(prioritiesResponse);
        setStates(statesResponse);

        if (!selectedGoalId && goalsResponse.length > 0) {
          setSelectedGoalId(goalsResponse[0].id);
        }

        setNewGoal((current) => ({
          ...current,
          idTipoObjetivo: current.idTipoObjetivo || String(goalTypesResponse[0]?.id ?? ""),
          idPrioridad: current.idPrioridad || String(prioritiesResponse[0]?.id ?? ""),
          idCuenta: current.idCuenta || String(accountsResponse[0]?.id ?? ""),
          idEstado: current.idEstado || String(statesResponse[0]?.id ?? ""),
        }));
      } catch (error) {
        if (!active) {
          return;
        }

        setError(error instanceof Error ? error.message : "No se pudieron cargar los objetivos");
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

  useEffect(() => {
    if (selectedGoalId === null && goals.length > 0) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? goals[0] ?? null,
    [goals, selectedGoalId],
  );

  const getCurrentAmount = (goal: GoalRecord) => {
    const linkedAccount = accounts.find((account) => account.id === goal.idCuenta);
    return Number(linkedAccount?.saldoActual ?? 0);
  };

  const calculateStrategies = (goal: GoalRecord): Strategy[] => {
    const currentAmount = getCurrentAmount(goal);
    const targetAmount = Number(goal.montoMeta);
    const remaining = Math.max(targetAmount - currentAmount, 0);
    const monthsUntilDeadline = Math.max(
      1,
      Math.ceil(
        (new Date(goal.fechaLimite).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24 * 30),
      ),
    );

    return [
      {
        name: "Alto Impacto",
        icon: Zap,
        color: "text-red-600",
        monthlyPayment: remaining / (monthsUntilDeadline * 0.6),
        timeToGoal: Math.ceil(monthsUntilDeadline * 0.6),
        description: "Estrategia agresiva para alcanzar tu objetivo rápidamente",
        actions: [
          "Reducir gastos no esenciales en un 40%",
          "Destinar el 50% de ingresos extra al objetivo",
          "Buscar ingresos adicionales (freelance, ventas)",
          "Optimizar deudas de alto interés",
        ],
      },
      {
        name: "Impacto Medio",
        icon: TrendingUp,
        color: "text-orange-600",
        monthlyPayment: remaining / monthsUntilDeadline,
        timeToGoal: monthsUntilDeadline,
        description: "Balance entre ahorro sostenible y progreso constante",
        actions: [
          "Reducir gastos no esenciales en un 20%",
          "Destinar el 30% de ingresos extra al objetivo",
          "Automatizar ahorros mensuales",
          "Revisar y ajustar presupuesto mensualmente",
        ],
      },
      {
        name: "Bajo Impacto",
        icon: Clock,
        color: "text-blue-600",
        monthlyPayment: remaining / (monthsUntilDeadline * 1.5),
        timeToGoal: Math.ceil(monthsUntilDeadline * 1.5),
        description: "Estrategia flexible que se adapta a tu ritmo de vida",
        actions: [
          "Reducir gastos no esenciales en un 10%",
          "Destinar el 15% de ingresos extra al objetivo",
          "Ahorrar de forma gradual sin sacrificios mayores",
          "Revisar progreso trimestralmente",
        ],
      },
    ];
  };

  const handleAddGoal = async () => {
    await fetchJson<GoalRecord>("/api/objetivos", {
      method: "POST",
      body: JSON.stringify({
        nombreObjetivo: newGoal.nombreObjetivo,
        idTipoObjetivo: Number(newGoal.idTipoObjetivo),
        montoMeta: Number(newGoal.montoMeta),
        fechaLimite: new Date(newGoal.fechaLimite).toISOString(),
        idPrioridad: newGoal.idPrioridad ? Number(newGoal.idPrioridad) : undefined,
        idEstado: newGoal.idEstado ? Number(newGoal.idEstado) : undefined,
        idCuenta: newGoal.idCuenta ? Number(newGoal.idCuenta) : undefined,
      }),
    });

    setNewGoal({
      nombreObjetivo: "",
      idTipoObjetivo: goalTypes[0] ? String(goalTypes[0].id) : "",
      montoMeta: "0",
      fechaLimite: "",
      idPrioridad: priorities[0] ? String(priorities[0].id) : "",
      idCuenta: accounts[0] ? String(accounts[0].id) : "",
      idEstado: states[0] ? String(states[0].id) : "",
    });
    setIsDialogOpen(false);
    setGoals(await fetchJson<GoalRecord[]>("/api/objetivos"));
  };

  const currentAmount = selectedGoal ? getCurrentAmount(selectedGoal) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Objetivos Financieros</h2>
          <p className="text-muted-foreground">Define tus metas y obtén un plan personalizado</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Target className="mr-2 h-4 w-4" />
          Nuevo objetivo
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Cargando objetivos...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No tienes objetivos financieros. ¡Crea uno para comenzar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const goalCurrentAmount = getCurrentAmount(goal);
              const progress = Number(goal.montoMeta) > 0
                ? (goalCurrentAmount / Number(goal.montoMeta)) * 100
                : 0;

              return (
                <Card
                  key={goal.id}
                  className={`cursor-pointer transition-all ${
                    selectedGoal?.id === goal.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedGoalId(goal.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {goal.nombreObjetivo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Objetivo</p>
                          <p>{formatCurrency(Number(goal.montoMeta))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cuenta asociada</p>
                          <p>{goal.cuenta?.nombre || "Sin cuenta"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Estado</p>
                          <p>{goal.estado?.nombre || "Sin estado"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedGoal && (
            <Card>
              <CardHeader>
                <CardTitle>Plan Financiero - {selectedGoal.nombreObjetivo}</CardTitle>
                <CardDescription>
                  Elige la estrategia que mejor se adapte a tus posibilidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="high" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="high">Alto Impacto</TabsTrigger>
                    <TabsTrigger value="medium">Impacto Medio</TabsTrigger>
                    <TabsTrigger value="low">Bajo Impacto</TabsTrigger>
                  </TabsList>

                  {calculateStrategies(selectedGoal).map((strategy, index) => {
                    const tabValue = ["high", "medium", "low"][index];
                    const Icon = strategy.icon;

                    return (
                      <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className={`rounded-lg bg-secondary p-3 ${strategy.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="mb-2 text-xl">{strategy.name}</h3>
                            <p className="text-muted-foreground">{strategy.description}</p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardContent className="pt-6">
                              <p className="text-sm text-muted-foreground">Ahorro mensual requerido</p>
                              <p className="text-2xl">{formatCurrency(strategy.monthlyPayment)}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <p className="text-sm text-muted-foreground">Tiempo estimado</p>
                              <p className="text-2xl">{strategy.timeToGoal} meses</p>
                            </CardContent>
                          </Card>
                        </div>

                        <div>
                          <h4 className="mb-3">Plan de acción</h4>
                          <ul className="space-y-2">
                            {strategy.actions.map((action, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Badge variant="outline" className="mt-0.5">
                                  {i + 1}
                                </Badge>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <Button className="w-full">Seleccionar esta estrategia</Button>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear objetivo financiero</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="goal-name">Nombre del objetivo</Label>
              <Input
                id="goal-name"
                value={newGoal.nombreObjetivo}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, nombreObjetivo: e.target.value })
                }
                placeholder="Ej: Fondo de Emergencia"
              />
            </div>
            <div>
              <Label htmlFor="goal-type">Tipo de objetivo</Label>
              <Select
                value={newGoal.idTipoObjetivo}
                onValueChange={(value) => setNewGoal({ ...newGoal, idTipoObjetivo: value })}
              >
                <SelectTrigger id="goal-type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {goalTypes.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal-target">Monto objetivo</Label>
              <Input
                id="goal-target"
                type="number"
                value={newGoal.montoMeta}
                onChange={(e) => setNewGoal({ ...newGoal, montoMeta: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="goal-deadline">Fecha límite</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={newGoal.fechaLimite}
                onChange={(e) => setNewGoal({ ...newGoal, fechaLimite: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="goal-priority">Prioridad</Label>
              <Select
                value={newGoal.idPrioridad}
                onValueChange={(value) => setNewGoal({ ...newGoal, idPrioridad: value })}
              >
                <SelectTrigger id="goal-priority">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal-account">Cuenta asociada</Label>
              <Select
                value={newGoal.idCuenta}
                onValueChange={(value) => setNewGoal({ ...newGoal, idCuenta: value })}
              >
                <SelectTrigger id="goal-account">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal-state">Estado</Label>
              <Select
                value={newGoal.idEstado}
                onValueChange={(value) => setNewGoal({ ...newGoal, idEstado: value })}
              >
                <SelectTrigger id="goal-state">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void handleAddGoal()} className="w-full">
              Crear objetivo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
