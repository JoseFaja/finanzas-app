"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Target, TrendingUp, Zap, Clock, Pencil, Trash2, Sparkles } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { fetchJson } from "./figma-api";
import type { GoalPlanVariant } from "../../lib/financial-insights";

const planLabelByKey: Record<GoalPlanVariant["key"], string> = {
  high: "Alto impacto",
  medium: "Impacto medio",
  low: "Bajo impacto",
};

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
  idCuenta: number | null;
  tipoObjetivo: CatalogItem;
  prioridad: CatalogItem | null;
  cuenta: CatalogItem | null;
}

interface SavedPlanSummary {
  id: number;
  fechaGeneracion: string;
  ahorroSugerido: number;
  ingresoMensualEstimado: number;
  gastoMensualEstimado: number;
  nivelRiesgo: string;
  planElegido: string;
  planElegidoKey: "high" | "medium" | "low";
}

function getStrategyLabel(key: "high" | "medium" | "low") {
  if (key === "high") {
    return "Alto impacto";
  }

  if (key === "medium") {
    return "Impacto medio";
  }

  return "Bajo impacto";
}

interface GoalPlanResponse {
  goal: {
    id: number;
    nombreObjetivo: string;
    montoMeta: number;
    fechaLimite: string;
    currentAmount: number;
    remainingAmount: number;
    monthsLeft: number;
    accountName: string | null;
    accountBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyDebtCommitment: number;
    monthlyDisposableIncome: number;
    debtPressure: number;
  };
  plans: GoalPlanVariant[];
  aiUsed: boolean;
  summary: string;
  selectedPlanKey: "high" | "medium" | "low";
  planGuardado: SavedPlanSummary | null;
  historialGuardado: SavedPlanSummary[];
  planAnterior: SavedPlanSummary | null;
}

const DEFAULT_GOAL_TYPES = [
  "Ahorro",
  "Fondo de emergencia",
  "Inversión",
  "Viaje",
  "Educación",
  "Compra importante",
  "Otro",
];

const normalizeText = (value: string) => value.trim().toLowerCase();

async function loadGoalTypes() {
  const existingTypes = await fetchJson<CatalogItem[]>("/api/catalogos/tipo-objetivo");
  const knownNames = new Set(existingTypes.map((item) => normalizeText(item.nombre)));
  const missingTypes = DEFAULT_GOAL_TYPES.filter((name) => !knownNames.has(normalizeText(name)));

  if (missingTypes.length > 0) {
    await Promise.all(
      missingTypes.map((nombre) =>
        fetchJson<CatalogItem>("/api/catalogos/tipo-objetivo", {
          method: "POST",
          body: JSON.stringify({ nombre }),
        }),
      ),
    );

    return fetchJson<CatalogItem[]>("/api/catalogos/tipo-objetivo");
  }

  return existingTypes;
}

export function GoalsView() {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [goalTypes, setGoalTypes] = useState<CatalogItem[]>([]);
  const [priorities, setPriorities] = useState<CatalogItem[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planData, setPlanData] = useState<GoalPlanResponse | null>(null);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false);
  const [planEditorForm, setPlanEditorForm] = useState<{
    goalId: number | null;
    variant: "high" | "medium" | "low";
    monthlyAmount: string;
    months: string;
  }>({ goalId: null, variant: "medium", monthlyAmount: "", months: "" });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedStrategyKey, setSelectedStrategyKey] = useState<"high" | "medium" | "low">("medium");
  const planSectionRef = useRef<HTMLDivElement | null>(null);
  const [newGoal, setNewGoal] = useState({
    nombreObjetivo: "",
    idTipoObjetivo: "",
    montoMeta: "0",
    fechaLimite: "",
    idPrioridad: "",
    idCuenta: "",
  });

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? goals[0] ?? null,
    [goals, selectedGoalId],
  );

  const getCurrentAmount = (goal: GoalRecord) => {
    const linkedAccount = accounts.find((account) => account.id === goal.idCuenta);
    return Number(linkedAccount?.saldoActual ?? 0);
  };

  const loadRecommendations = useCallback(
    async (
      goalId: number,
      selectedPlanKey: "high" | "medium" | "low" = "medium",
      persist = false,
    ) => {
      setPlanLoading(true);
      setPlanError(null);

      try {
        let response: GoalPlanResponse;

        if (persist) {
          response = await fetchJson<GoalPlanResponse>("/api/objetivos/recomendaciones", {
            method: "POST",
            body: JSON.stringify({ goalId, selectedPlanKey, persist }),
          });
        } else {
          response = await fetchJson<GoalPlanResponse>(`/api/objetivos/recomendaciones?goalId=${goalId}`);
        }

        setPlanData(response);
        setSelectedStrategyKey(response.selectedPlanKey ?? selectedPlanKey);
        return response;
      } catch (error) {
        setPlanError(error instanceof Error ? error.message : "No se pudieron cargar las recomendaciones");
        setPlanData(null);
        if (persist) {
          throw error;
        }
      } finally {
        setPlanLoading(false);
      }
    },
    [],
  );

  const openPlanEditor = useCallback(
    async (goalId: number, strategyKey: "high" | "medium" | "low") => {
      setSelectedGoalId(goalId);
      setSelectedStrategyKey(strategyKey);
      await loadRecommendations(goalId, strategyKey, false);
      requestAnimationFrame(() => {
        planSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [loadRecommendations],
  );

  const handleEditPlanClick = async (goalId: number, strategyKey: "high" | "medium" | "low") => {
    await openPlanEditor(goalId, strategyKey);
    // Prefill form from planData
    const strategy = planData?.plans?.find((p) => p.key === strategyKey);
    setPlanEditorForm({
      goalId,
      variant: strategyKey,
      monthlyAmount: strategy ? String(strategy.monthlyContribution ?? "") : "",
      months: strategy ? String(strategy.estimatedMonths ?? "") : "",
    });
    setIsPlanEditorOpen(true);
  };

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [goalsResponse, accountsResponse, prioritiesResponse, goalTypesResponse] = await Promise.all([
          fetchJson<GoalRecord[]>("/api/objetivos"),
          fetchJson<AccountItem[]>("/api/cuentas"),
          fetchJson<CatalogItem[]>("/api/catalogos/prioridad"),
          loadGoalTypes(),
        ]);

        if (!active) {
          return;
        }

        setGoals(goalsResponse);
        setAccounts(accountsResponse);
        setGoalTypes(goalTypesResponse);
        setPriorities(prioritiesResponse);

        if (goalsResponse.length > 0) {
          const firstGoalId = goalsResponse[0].id;
          setSelectedGoalId((current) => current ?? firstGoalId);
          // Preview without persisting on initial load
          void loadRecommendations(firstGoalId, "medium", false);
        }

        setNewGoal((current) => ({
          ...current,
          idTipoObjetivo: current.idTipoObjetivo || String(goalTypesResponse[0]?.id ?? ""),
          idPrioridad: current.idPrioridad || String(prioritiesResponse[0]?.id ?? ""),
          idCuenta: current.idCuenta || String(accountsResponse[0]?.id ?? ""),
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
  }, [loadRecommendations]);

  const handleSelectStrategy = async (strategyKey: "high" | "medium" | "low") => {
    if (!selectedGoal) {
      return;
    }

    setSelectedStrategyKey(strategyKey);
    // Persist the selection (save plan)
    try {
      await loadRecommendations(selectedGoal.id, strategyKey, true);
      // show success toast
      setToastMessage("Plan guardado correctamente");
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage("No se pudo guardar el plan");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const openCreateDialog = () => {
    setEditingGoal(null);
    setNewGoal({
      nombreObjetivo: "",
      idTipoObjetivo: goalTypes[0] ? String(goalTypes[0].id) : "",
      montoMeta: "0",
      fechaLimite: "",
      idPrioridad: priorities[0] ? String(priorities[0].id) : "",
      idCuenta: accounts[0] ? String(accounts[0].id) : "",
    });
    setError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (goal: GoalRecord) => {
    setEditingGoal(goal);
    setNewGoal({
      nombreObjetivo: goal.nombreObjetivo,
      idTipoObjetivo: String(goal.idTipoObjetivo),
      montoMeta: String(goal.montoMeta),
      fechaLimite: goal.fechaLimite.slice(0, 10),
      idPrioridad: goal.idPrioridad ? String(goal.idPrioridad) : "",
      idCuenta: goal.idCuenta ? String(goal.idCuenta) : "",
    });
    setError(null);
    setIsDialogOpen(true);
  };

  const handleAddGoal = async () => {
    try {
      setError(null);
      setLoading(true);

      const payload = {
        nombreObjetivo: newGoal.nombreObjetivo,
        idTipoObjetivo: Number(newGoal.idTipoObjetivo),
        montoMeta: Number(newGoal.montoMeta),
        fechaLimite: new Date(newGoal.fechaLimite).toISOString(),
        idPrioridad: newGoal.idPrioridad ? Number(newGoal.idPrioridad) : undefined,
        idCuenta: newGoal.idCuenta ? Number(newGoal.idCuenta) : undefined,
      };

      if (editingGoal) {
        await fetchJson<GoalRecord>(`/api/objetivos/${editingGoal.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson<GoalRecord>("/api/objetivos", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setNewGoal({
        nombreObjetivo: "",
        idTipoObjetivo: goalTypes[0] ? String(goalTypes[0].id) : "",
        montoMeta: "0",
        fechaLimite: "",
        idPrioridad: priorities[0] ? String(priorities[0].id) : "",
        idCuenta: accounts[0] ? String(accounts[0].id) : "",
      });
      setEditingGoal(null);
      setIsDialogOpen(false);
      setGoals(await fetchJson<GoalRecord[]>("/api/objetivos"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    try {
      setError(null);
      setLoading(true);
      await fetchJson(`/api/objetivos/${goalId}`, { method: "DELETE" });
      setGoals(await fetchJson<GoalRecord[]>("/api/objetivos"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Objetivos Financieros</h2>
          <p className="text-muted-foreground">Define tus metas y obtén un plan personalizado</p>
        </div>
        <Button onClick={openCreateDialog}>
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
              No tienes objetivos financieros. ┬íCrea uno para comenzar!
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
              const savedPlan = planData?.goal?.id === goal.id ? planData.planGuardado : null;

              return (
                <Card
                  key={goal.id}
                  className={`cursor-pointer transition-all ${
                    selectedGoal?.id === goal.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedGoalId(goal.id);
                    // Preview plans without persisting
                    void loadRecommendations(goal.id, "medium", false);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        {goal.nombreObjetivo}
                      </CardTitle>
                      <div className="flex gap-1 items-center">
                        {savedPlan ? (
                          <Badge variant="secondary" className="mr-2">
                            {getStrategyLabel(savedPlan.planElegidoKey)}
                          </Badge>
                        ) : null}
                        {savedPlan ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleEditPlanClick(goal.id, savedPlan.planElegidoKey);
                            }}
                          >
                            Editar plan
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDialog(goal);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteGoal(goal.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground">
                      {savedPlan ? (
                        <>
                          <strong className="mr-1">Plan:</strong> {savedPlan.planElegido} · {formatCurrency(savedPlan.ahorroSugerido)} sugerido
                        </>
                      ) : (
                        <span>Sin plan guardado</span>
                      )}
                    </p>
                  </CardContent>
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedGoal && (
            <div ref={planSectionRef}>
              <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>Plan Financiero - {selectedGoal.nombreObjetivo}</CardTitle>
                    <CardDescription>
                      La recomendación se ajusta con tus cuentas, deudas, ingresos y gastos.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      {planData?.aiUsed ? "IA activa" : "Modo inteligente"}
                    </Badge>
                    <Badge variant="secondary">Seleccionada: {getStrategyLabel(selectedStrategyKey)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {planLoading ? <p className="mb-4 text-sm text-muted-foreground">Generando recomendaciones...</p> : null}
                {planError ? <p className="mb-4 text-sm text-destructive">{planError}</p> : null}

                {planData ? (
                  <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-2">
                      <CardContent className="space-y-3 pt-6">
                        <div className="text-sm text-muted-foreground">
                          Resumen de la recomendación
                        </div>
                        <p>{planData.summary}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Plan escogido:</span>
                          <Badge variant="secondary">{planLabelByKey[planData.selectedPlanKey]}</Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Saldo disponible</p>
                            <p>{formatCurrency(planData.goal.accountBalance)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Monto pendiente</p>
                            <p>{formatCurrency(planData.goal.remainingAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Meses restantes</p>
                            <p>{planData.goal.monthsLeft}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Estrategia activa</p>
                            <p>{getStrategyLabel(selectedStrategyKey)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {planData.planGuardado ? (
                      <Card className="md:col-span-3">
                        <CardHeader className="pb-3">
                          <CardTitle>Plan guardado</CardTitle>
                          <CardDescription>
                            Este plan quedó registrado para seguimiento histórico y comparación futura.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 md:grid-cols-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Fecha</p>
                              <p>{formatDate(planData.planGuardado.fechaGeneracion)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Ahorro sugerido</p>
                              <p>{formatCurrency(planData.planGuardado.ahorroSugerido)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Nivel de riesgo</p>
                              <p>{planData.planGuardado.nivelRiesgo}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Plan base</p>
                              <p className="capitalize">{planData.planGuardado.planElegido}</p>
                            </div>
                            {/* aiAjustado removed from UI - no longer displayed */}
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}

                    {planData.historialGuardado.length > 0 ? (
                      <Card className="md:col-span-3">
                        <CardHeader className="pb-3">
                          <CardTitle>Historial de planes</CardTitle>
                          <CardDescription>Últimos planes generados y guardados para este objetivo</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {planData.historialGuardado.map((plan) => (
                              <div key={plan.id} className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="font-medium">{formatDate(plan.fechaGeneracion)}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Riesgo {plan.nivelRiesgo} · base {plan.planElegido}
                                      </p>
                                </div>
                                <div className="grid gap-3 text-sm md:grid-cols-3 md:text-right">
                                  <div>
                                    <p className="text-muted-foreground">Sugerido</p>
                                    <p>{formatCurrency(plan.ahorroSugerido)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Ingresos</p>
                                    <p>{formatCurrency(plan.ingresoMensualEstimado)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Gastos</p>
                                    <p>{formatCurrency(plan.gastoMensualEstimado)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                ) : null}

                <Tabs value={selectedStrategyKey} onValueChange={(value) => setSelectedStrategyKey(value as "high" | "medium" | "low")} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="high">Alto Impacto</TabsTrigger>
                    <TabsTrigger value="medium">Impacto Medio</TabsTrigger>
                    <TabsTrigger value="low">Bajo Impacto</TabsTrigger>
                  </TabsList>

                  {(planData?.plans ?? []).map((strategy) => {
                    const Icon = strategy.key === "high" ? Zap : strategy.key === "medium" ? TrendingUp : Clock;

                    return (
                      <TabsContent key={strategy.key} value={strategy.key} className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`rounded-lg p-3 ${
                              strategy.key === "high"
                                ? "bg-red-100 text-red-600"
                                : strategy.key === "medium"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className="text-xl">{strategy.title}</h3>
                              <Badge variant="outline">Viabilidad {strategy.viability}</Badge>
                            </div>
                            <p className="text-muted-foreground">{strategy.description}</p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardContent className="pt-6">
                              <p className="text-sm text-muted-foreground">Ahorro mensual requerido</p>
                              <p className="text-2xl">{formatCurrency(strategy.monthlyContribution)}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <p className="text-sm text-muted-foreground">Tiempo estimado</p>
                              <p className="text-2xl">{strategy.estimatedMonths} meses</p>
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

                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardContent className="pt-6">
                              <p className="text-sm text-muted-foreground">Trade-offs</p>
                              <ul className="mt-3 space-y-2 text-sm">
                                {strategy.tradeoffs.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <Badge variant="outline" className="mt-0.5">
                                      !
                                    </Badge>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <p className="text-sm text-muted-foreground">Notas de IA</p>
                              <ul className="mt-3 space-y-2 text-sm">
                                {strategy.notes.map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <Badge variant="outline" className="mt-0.5">
                                      AI
                                    </Badge>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        </div>

                        <Button className="w-full" onClick={() => void handleSelectStrategy(strategy.key)}>
                          {selectedStrategyKey === strategy.key ? "Estrategia seleccionada" : "Seleccionar esta estrategia"}
                        </Button>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Editar objetivo financiero" : "Crear objetivo financiero"}</DialogTitle>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="goal-name">Nombre del objetivo</Label>
              <Input
                id="goal-name"
                value={newGoal.nombreObjetivo}
                onChange={(e) => setNewGoal({ ...newGoal, nombreObjetivo: e.target.value })}
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
              <Label htmlFor="goal-deadline">Fecha l├¡mite</Label>
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
            <Button onClick={() => void handleAddGoal()} className="w-full">
              {editingGoal ? "Guardar cambios" : "Crear objetivo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isPlanEditorOpen} onOpenChange={setIsPlanEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="plan-variant">Tipo de plan</Label>
              <Select
                value={planEditorForm.variant}
                onValueChange={(value: "high" | "medium" | "low") =>
                  setPlanEditorForm((current) => ({ ...current, variant: value }))
                }
              >
                <SelectTrigger id="plan-variant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alto impacto</SelectItem>
                  <SelectItem value="medium">Impacto medio</SelectItem>
                  <SelectItem value="low">Bajo impacto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="plan-monthly">Aporte mensual</Label>
                <Input id="plan-monthly" inputMode="numeric" value={planEditorForm.monthlyAmount} onChange={(e) => setPlanEditorForm((c) => ({ ...c, monthlyAmount: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="plan-months">Horizonte (meses)</Label>
                <Input id="plan-months" inputMode="numeric" value={planEditorForm.months} onChange={(e) => setPlanEditorForm((c) => ({ ...c, months: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsPlanEditorOpen(false)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  if (!planEditorForm.goalId) return;
                  setPlanLoading(true);
                  setPlanError(null);
                  try {
                    const body: {
                      goalId: number;
                      selectedPlanKey: "high" | "medium" | "low";
                      persist: true;
                      monthlyContribution?: number;
                      horizonMonths?: number;
                    } = {
                      goalId: Number(planEditorForm.goalId),
                      selectedPlanKey: planEditorForm.variant,
                      persist: true,
                      monthlyContribution: planEditorForm.monthlyAmount ? Number(planEditorForm.monthlyAmount) : undefined,
                      horizonMonths: planEditorForm.months ? Number(planEditorForm.months) : undefined,
                    };

                    const res = await fetch("/api/objetivos/recomendaciones", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });

                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data?.error || "Error al guardar plan");
                    }
                    setPlanData(data as GoalPlanResponse);
                    setToastMessage("Plan guardado correctamente");
                    setTimeout(() => setToastMessage(null), 3000);
                    setIsPlanEditorOpen(false);
                  } catch (e) {
                    setPlanError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setPlanLoading(false);
                  }
                }}
              >
                Guardar plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="rounded-md bg-primary px-4 py-2 text-white shadow-lg">
            {toastMessage}
          </div>
        </div>
      ) : null}
    </div>
  );
}
