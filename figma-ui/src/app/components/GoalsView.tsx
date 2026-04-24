import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Target, TrendingUp, Zap, Clock } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

interface Strategy {
  name: string;
  icon: any;
  color: string;
  monthlyPayment: number;
  timeToGoal: number;
  description: string;
  actions: string[];
}

export function GoalsView() {
  const [goals, setGoals] = useState<FinancialGoal[]>([
    {
      id: "1",
      name: "Fondo de Emergencia",
      targetAmount: 15000000,
      currentAmount: 5000000,
      deadline: "2027-12-31",
    },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(goals[0]);
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: 0,
    currentAmount: 0,
    deadline: "",
  });

  const handleAddGoal = () => {
    const goal = {
      id: Date.now().toString(),
      ...newGoal,
    };
    setGoals([...goals, goal]);
    setSelectedGoal(goal);
    setNewGoal({
      name: "",
      targetAmount: 0,
      currentAmount: 0,
      deadline: "",
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

  const calculateStrategies = (goal: FinancialGoal): Strategy[] => {
    const remaining = goal.targetAmount - goal.currentAmount;
    const monthsUntilDeadline = Math.ceil(
      (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Objetivos Financieros</h2>
          <p className="text-muted-foreground">Define tus metas y obtén un plan personalizado</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Target className="w-4 h-4 mr-2" />
          Nuevo objetivo
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No tienes objetivos financieros. ¡Crea uno para comenzar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <Card
                  key={goal.id}
                  className={`cursor-pointer transition-all ${
                    selectedGoal?.id === goal.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedGoal(goal)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      {goal.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Objetivo</p>
                        <p>{formatCurrency(goal.targetAmount)}</p>
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
                <CardTitle>Plan Financiero - {selectedGoal.name}</CardTitle>
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
                          <div className={`p-3 rounded-lg bg-secondary ${strategy.color}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl mb-2">{strategy.name}</h3>
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
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                placeholder="Ej: Fondo de Emergencia"
              />
            </div>
            <div>
              <Label htmlFor="goal-target">Monto objetivo</Label>
              <Input
                id="goal-target"
                type="number"
                value={newGoal.targetAmount}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, targetAmount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="goal-current">Monto actual</Label>
              <Input
                id="goal-current"
                type="number"
                value={newGoal.currentAmount}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, currentAmount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="goal-deadline">Fecha límite</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              />
            </div>
            <Button onClick={handleAddGoal} className="w-full">
              Crear objetivo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
