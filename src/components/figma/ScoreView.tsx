import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Award } from "lucide-react";
import { Badge } from "./ui/badge";

export function ScoreView() {
  const currentScore = 720;
  const previousScore = 680;
  const scoreDiff = currentScore - previousScore;

  const monthlyScoreData = [
    { month: "Oct", score: 650 },
    { month: "Nov", score: 660 },
    { month: "Dic", score: 670 },
    { month: "Ene", score: 680 },
    { month: "Feb", score: 690 },
    { month: "Mar", score: 710 },
    { month: "Abr", score: 720 },
  ];

  const financialMetrics = [
    { month: "Oct", ingresos: 4500000, gastos: 3800000, ahorros: 700000 },
    { month: "Nov", ingresos: 4500000, gastos: 3600000, ahorros: 900000 },
    { month: "Dic", ingresos: 5200000, gastos: 4100000, ahorros: 1100000 },
    { month: "Ene", ingresos: 4500000, gastos: 3500000, ahorros: 1000000 },
    { month: "Feb", ingresos: 5700000, gastos: 3700000, ahorros: 2000000 },
    { month: "Mar", ingresos: 4500000, gastos: 3400000, ahorros: 1100000 },
    { month: "Abr", ingresos: 4500000, gastos: 3200000, ahorros: 1300000 },
  ];

  const getScoreRating = (score: number) => {
    if (score >= 750) return { label: "Excelente", color: "bg-green-600" };
    if (score >= 700) return { label: "Muy Bueno", color: "bg-blue-600" };
    if (score >= 650) return { label: "Bueno", color: "bg-yellow-600" };
    if (score >= 600) return { label: "Regular", color: "bg-orange-600" };
    return { label: "Necesita Mejora", color: "bg-red-600" };
  };

  const rating = getScoreRating(currentScore);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const scoreFactors = [
    {
      name: "Ratio de ahorro",
      value: 85,
      description: "Excelente capacidad de ahorro mensual",
      impact: "positive",
    },
    {
      name: "Gestión de deudas",
      value: 70,
      description: "Deudas bajo control, pago puntual",
      impact: "positive",
    },
    {
      name: "Diversificación",
      value: 60,
      description: "Puedes mejorar diversificando tus cuentas",
      impact: "neutral",
    },
    {
      name: "Consistencia",
      value: 90,
      description: "Excelente historial de transacciones regulares",
      impact: "positive",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl">Score Financiero</h2>
        <p className="text-muted-foreground">
          Monitorea tu salud financiera mes a mes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Score Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <span className="text-5xl">{currentScore}</span>
                <span className="text-muted-foreground">/1000</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={rating.color}>{rating.label}</Badge>
                {scoreDiff > 0 ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    +{scoreDiff} pts
                  </div>
                ) : scoreDiff < 0 ? (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <TrendingDown className="w-4 h-4" />
                    {scoreDiff} pts
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Evolución del Score</CardTitle>
            <CardDescription>Últimos 7 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyScoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[600, 800]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Factores del Score</CardTitle>
          <CardDescription>
            Áreas que impactan tu puntuación financiera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scoreFactors.map((factor) => (
              <div key={factor.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p>{factor.name}</p>
                    <p className="text-sm text-muted-foreground">{factor.description}</p>
                  </div>
                  <span className="text-lg">{factor.value}/100</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      factor.impact === "positive"
                        ? "bg-green-600"
                        : factor.impact === "neutral"
                        ? "bg-yellow-600"
                        : "bg-red-600"
                    }`}
                    style={{ width: `${factor.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flujo de Efectivo Mensual</CardTitle>
          <CardDescription>Ingresos, gastos y ahorros</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={financialMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="ingresos"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Ingresos"
              />
              <Area
                type="monotone"
                dataKey="gastos"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Gastos"
              />
              <Area
                type="monotone"
                dataKey="ahorros"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Ahorros"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
