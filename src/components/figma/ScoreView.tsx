"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Award } from "lucide-react";
import { Badge } from "./ui/badge";
import { fetchJson } from "./figma-api";

interface ScoreFactor {
  nombre: string;
  valor: number;
  descripcion: string;
}

interface ScoreHistoryPoint {
  month: string;
  score: number;
}

interface ScoreFlowPoint {
  month: string;
  ingresos: number;
  gastos: number;
  ahorros: number;
}

interface ScoreResponse {
  scoreActual: number;
  historial: ScoreHistoryPoint[];
  factores: ScoreFactor[];
  flujo: ScoreFlowPoint[];
}

export function ScoreView() {
  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchJson<ScoreResponse>("/api/score");

        if (!active) {
          return;
        }

        setScoreData(response);
      } catch (error) {
        if (!active) {
          return;
        }

        setError(error instanceof Error ? error.message : "No se pudo cargar el score");
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

  const currentScore = scoreData?.scoreActual ?? 0;
  const previousScore = scoreData?.historial?.at(-2)?.score ?? currentScore;
  const scoreDiff = currentScore - previousScore;

  const monthlyScoreData = scoreData?.historial ?? [];
  const financialMetrics = scoreData?.flujo ?? [];
  const scoreFactors = scoreData?.factores ?? [];

  const getScoreRating = (score: number) => {
    if (score >= 750) return { label: "Excelente", color: "bg-green-600" };
    if (score >= 700) return { label: "Muy Bueno", color: "bg-blue-600" };
    if (score >= 650) return { label: "Bueno", color: "bg-yellow-600" };
    if (score >= 600) return { label: "Regular", color: "bg-orange-600" };
    return { label: "Necesita Mejora", color: "bg-red-600" };
  };

  const rating = getScoreRating(currentScore);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const factorRows = useMemo(
    () =>
      scoreFactors.map((factor) => ({
        ...factor,
        impact:
          factor.valor >= 70 ? ("positive" as const) : factor.valor >= 50 ? ("neutral" as const) : ("negative" as const),
      })),
    [scoreFactors],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl">Score Financiero</h2>
        <p className="text-muted-foreground">
          Monitorea tu salud financiera mes a mes
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Cargando score...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
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
                    <TrendingUp className="h-4 w-4" />
                    +{scoreDiff} pts
                  </div>
                ) : scoreDiff < 0 ? (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <TrendingDown className="h-4 w-4" />
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
                <YAxis domain={[0, 1000]} />
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
            {factorRows.map((factor) => (
              <div key={factor.nombre} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p>{factor.nombre}</p>
                    <p className="text-sm text-muted-foreground">{factor.descripcion}</p>
                  </div>
                  <span className="text-lg">{factor.valor}/100</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div
                    className={`h-2 rounded-full ${
                      factor.impact === "positive"
                        ? "bg-green-600"
                        : factor.impact === "neutral"
                        ? "bg-yellow-600"
                        : "bg-red-600"
                    }`}
                    style={{ width: `${factor.valor}%` }}
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
              <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
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
