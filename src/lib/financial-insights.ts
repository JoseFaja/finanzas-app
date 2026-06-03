import { Prisma } from "@prisma/client";

type PlanKey = "high" | "medium" | "low";

export interface GoalPlanVariant {
  key: PlanKey;
  title: string;
  description: string;
  monthlyContribution: number;
  estimatedMonths: number;
  viability: "alta" | "media" | "baja";
  actions: string[];
  tradeoffs: string[];
  notes: string[];
}

export interface GoalRecommendationContext {
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
}

export interface ScoreHistoryPoint {
  month: string;
  score: number;
}

export interface ScoreFlowPoint {
  month: string;
  ingresos: number;
  gastos: number;
  pagosDeuda: number;
  ahorros: number;
}

export interface ScoreFactor {
  nombre: string;
  valor: number;
  descripcion: string;
}

export interface ScoreInsightResponse {
  scoreActual: number;
  historial: ScoreHistoryPoint[];
  factores: ScoreFactor[];
  flujo: ScoreFlowPoint[];
  consejos: string[];
  alertas: string[];
  tendencia: {
    variacion: number;
    descripcion: string;
  };
  historialPersistido: Array<{
    id: number;
    fechaCalculo: string;
    puntaje: number;
    ratioGastoIngreso: number;
    capacidadAhorro: number;
    nivelRiesgo: string | null;
  }>;
}

interface Snapshot {
  cuentas: Array<{ saldoActual: unknown; nombre: string }>;
  deudas: Array<{
    saldoPendiente: unknown;
    tasaIntereses: unknown;
    cuotas: number;
    cuotasPagadas: number;
  }>;
  transacciones: Array<{
    monto: unknown;
    fecha: Date;
    esIngreso: boolean;
    idDeuda: number | null;
  }>;
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("es-CO", { month: "short" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function monthsBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreRiskLabel(score: number) {
  if (score >= 750) {
    return "Bajo";
  }

  if (score >= 600) {
    return "Moderado";
  }

  return "Alto";
}

async function getScoreRiskLevelId(score: number) {
  const nombre = scoreRiskLabel(score);
  const { prisma } = await import("./prisma");
  const risk = await prisma.nivelRiesgo.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
    select: { id: true },
  });

  if (risk) {
    return risk.id;
  }

  const created = await prisma.nivelRiesgo.create({
    data: { nombre },
    select: { id: true },
  });

  return created.id;
}

async function persistScoreSnapshot(input: {
  userId: number;
  score: number;
  ratioGastoIngreso: number;
  capacidadAhorro: number;
}) {
  const idNivelRiesgo = await getScoreRiskLevelId(input.score);
  const { prisma } = await import("./prisma");

  await prisma.scoreFinanciero.create({
    data: {
      idUsuario: input.userId,
      puntaje: new Prisma.Decimal(input.score),
      idNivelRiesgo,
      ratioGastoIngreso: new Prisma.Decimal(input.ratioGastoIngreso),
      capacidadAhorro: new Prisma.Decimal(input.capacidadAhorro),
    },
  });
}

export async function tryAiGoalPlan(input: {
  context: GoalRecommendationContext["goal"];
  plans: GoalPlanVariant[];
  snapshot: Snapshot;
}): Promise<AiPlanResult | null> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const prompt = {
    goal: input.context,
    accounts: input.snapshot.cuentas.map((account) => ({
      nombre: account.nombre,
      saldoActual: toNumber(account.saldoActual),
    })),
    debts: input.snapshot.deudas.map((debt) => ({
      saldoPendiente: toNumber(debt.saldoPendiente),
      tasaIntereses: toNumber(debt.tasaIntereses),
      cuotas: debt.cuotas,
      cuotasPagadas: debt.cuotasPagadas,
    })),
    plans: input.plans,
  };

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content: `Eres un analista financiero. Lee cuidadosamente el objetivo, cuentas, deudas y planes baseline. Devuelve planes financieros mejorados como JSON válido (sin texto adicional):
{
  "plans": [
    {
      "key": "high|medium|low",
      "title": "string",
      "description": "string",
      "monthlyContribution": number,
      "estimatedMonths": integer,
      "viability": "alta|media|baja",
      "actions": ["string"],
      "tradeoffs": ["string"],
      "notes": ["string"]
    }
  ],
  "summary": "string"
}
Reglas estrictas:
- Debe haber exactamente 3 objetos en "plans": uno con "key": "high", otro "medium", otro "low".
- "monthlyContribution" debe ser un número entero >= 1 y <= remainingAmount.
- "estimatedMonths" debe ser coherente: ceil(remainingAmount / monthlyContribution).
- No modifiques otros campos. Si no puedes cumplir las restricciones, devuelve null.`,
          },
          {
            role: "user",
            content: JSON.stringify(prompt),
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const rawContent = payload.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      return null;
    }

    const jsonText = rawContent.match(/\{[\s\S]*\}/)?.[0] ?? rawContent;
    const parsed = JSON.parse(jsonText) as Partial<GoalRecommendationContext> & {
      plans?: GoalPlanVariant[];
      summary?: string;
    };

    if (!Array.isArray(parsed.plans) || parsed.plans.length !== 3) {
      return null;
    }

    // Validate and clamp AI plans to sensible numeric bounds
    const validated = validateAndClampPlans(parsed.plans, input.context, input.plans);

    if (!validated) {
      return null;
    }

    const finalSummary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0 ? parsed.summary.trim() : "Plan ajustado con IA.";

    if (validated.adjusted) {
      return {
        plans: validated.plans,
        summary: `${finalSummary} (Nota: se ajustaron valores para respetar límites financieros).`,
        adjusted: true,
      };
    }

    return { plans: validated.plans, summary: finalSummary, adjusted: false };
  } catch {
    return null;
  }
}

function validateAndClampPlans(
  plans: GoalPlanVariant[],
  context: GoalRecommendationContext["goal"],
  baselinePlans?: GoalPlanVariant[],
) {
  if (!Array.isArray(plans) || plans.length !== 3) return null;

  const keys = new Set(plans.map((p) => p.key));
  if (!keys.has("high") || !keys.has("medium") || !keys.has("low")) return null;

  let adjusted = false;

  const disposable = Math.max(context.monthlyDisposableIncome, 0);
  // Baseline map for deterministic mixing
  const baselineMap = new Map<PlanKey, number>();
  if (Array.isArray(baselinePlans)) {
    for (const b of baselinePlans) {
      baselineMap.set(b.key, Number(b.monthlyContribution ?? 0));
    }
  }

  // Use a blend of baseline and AI plans
  const alpha = 0.35; // blend weight for AI vs baseline (always use conservative blend)

  const normalized = plans.map((p) => {
    const monthly = Number(p.monthlyContribution ?? NaN) || 0;
    if (!isFinite(monthly) || monthly <= 0) return null;

    // Blend AI monthly with baseline to avoid unrelated large changes
    const baseline = baselineMap.get(p.key) ?? monthly;
    const blended = Math.round(baseline * (1 - alpha) + monthly * alpha);

    // Clamp to [1, remainingAmount]
    const clamped = clamp(blended, 1, Math.max(1, Math.round(context.remainingAmount)));

    if (clamped !== monthly) adjusted = true;

    const estimatedMonths = Math.max(1, Math.ceil(context.remainingAmount / Math.max(clamped, 1)));

    // Recompute viability based on disposable
    const viability =
      disposable >= clamped
        ? "alta"
        : disposable >= clamped * 0.75
        ? "media"
        : "baja";

    const actions = Array.isArray(p.actions) ? p.actions.map(String) : [];
    const tradeoffs = Array.isArray(p.tradeoffs) ? p.tradeoffs.map(String) : [];
    const notes = Array.isArray(p.notes) ? p.notes.map(String) : [];

    // If AI gave inconsistent estimatedMonths, adjust
    if (p.estimatedMonths !== estimatedMonths) adjusted = true;

    return {
      key: p.key,
      title: p.title || (p.key === "high" ? "Alto impacto" : p.key === "medium" ? "Impacto medio" : "Bajo impacto"),
      description: p.description || "",
      monthlyContribution: clamped,
      estimatedMonths,
      viability: viability as "alta" | "media" | "baja",
      actions,
      tradeoffs,
      notes: adjusted ? [...notes, "AI original ajustado para respetar límites"] : notes,
    } as GoalPlanVariant;
  });

  if (normalized.some((p) => p === null)) return null;

  return { plans: normalized as GoalPlanVariant[], adjusted };
}



function buildGoalPlans(context: GoalRecommendationContext["goal"]) {
  const baselineNeed = Math.max(context.remainingAmount / context.monthsLeft, 0);
  const disposable = Math.max(context.monthlyDisposableIncome, 0);

  let monthlyTargets = {
    high: Math.max(baselineNeed * 1.35, disposable * 0.8),
    medium: Math.max(baselineNeed, disposable * 0.55),
    low: Math.max(baselineNeed * 0.72, disposable * 0.3),
  };

  // Never suggest saving more than the remaining amount in a single month (no need to overshoot)
  monthlyTargets = {
    high: Math.min(monthlyTargets.high, context.remainingAmount),
    medium: Math.min(monthlyTargets.medium, context.remainingAmount),
    low: Math.min(monthlyTargets.low, context.remainingAmount),
  };

  const buildPlan = (
    key: PlanKey,
    title: string,
    description: string,
    monthlyContribution: number,
    actions: string[],
    tradeoffs: string[],
    notes: string[],
  ): GoalPlanVariant => {
    const estimatedMonths = Math.max(1, Math.ceil(context.remainingAmount / Math.max(monthlyContribution, 1)));
    const viability =
      disposable >= monthlyContribution
        ? "alta"
        : disposable >= monthlyContribution * 0.75
          ? "media"
          : "baja";

    return {
      key,
      title,
      description,
      monthlyContribution,
      estimatedMonths,
      viability,
      actions,
      tradeoffs,
      notes,
    };
  };

  return [
    buildPlan(
      "high",
      "Alto impacto",
      "Máxima aceleración con un esfuerzo más intenso sobre el presupuesto.",
      monthlyTargets.high,
      [
        "Automatiza el ahorro apenas entre el ingreso.",
        "Recorta gastos no esenciales de forma prioritaria.",
        "Destina ingresos extraordinarios 100% a la meta.",
        "Si hay deuda cara, cancélala antes de seguir ampliando el ahorro.",
      ],
      [
        "Requiere más disciplina y poca flexibilidad mensual.",
        "Puede presionar el flujo si aparecen gastos extraordinarios.",
      ],
      [
        `Meta actual: ${formatCurrency(monthlyTargets.high)} al mes.`,
        `Plazo estimado: ${Math.max(1, Math.ceil(context.remainingAmount / Math.max(monthlyTargets.high, 1)))} meses.`,
      ],
    ),
    buildPlan(
      "medium",
      "Impacto medio",
      "Balancea avance estable con margen para sostener tu vida diaria.",
      monthlyTargets.medium,
      [
        "Aparta un monto fijo el mismo día de cada mes.",
        "Revisa gasto discrecional y corrige fugas pequeñas.",
        "Usa bonos o ingresos extra para acelerar sin sacrificar liquidez.",
        "Reevalúa el plan cada mes con el nuevo score.",
      ],
      [
        "El avance es más constante que agresivo.",
        "Sigue necesitando seguimiento periódico para no desviarte.",
      ],
      [
        "Recomendado si buscas equilibrio entre progreso y estabilidad.",
      ],
    ),
    buildPlan(
      "low",
      "Bajo impacto",
      "Plan suave para sostener la meta sin tensionar tu flujo mensual.",
      monthlyTargets.low,
      [
        "Define un ahorro base pequeño pero innegociable.",
        "Mantén un colchón de liquidez para imprevistos.",
        "Si entra dinero extra, redirige solo una parte a la meta.",
        "Revisa el plan cada trimestre o cuando cambie tu ingreso.",
      ],
      [
        "Toma más tiempo para llegar al objetivo.",
        "Funciona mejor si hoy necesitas proteger caja y estabilidad.",
      ],
      [
        "Útil cuando el flujo es inestable o hay eventos próximos relevantes.",
      ],
    ),
  ];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildScoreFromMonthlyData(monthlyData: ScoreFlowPoint[], debtPressure: number) {
  return monthlyData.map((point, index) => {
    const previous = monthlyData[index - 1];
    const savingsRate = point.ingresos > 0 ? point.ahorros / Math.max(point.ingresos, 1) : 0;
    const expenseRatio = point.ingresos > 0 ? point.gastos / Math.max(point.ingresos, 1) : 1;
    const debtLoadPenalty = clamp(debtPressure * 140, 0, 140);
    const trendBonus = previous
      ? clamp((point.ahorros - previous.ahorros) / Math.max(point.ingresos || previous.ingresos || 1, 1) * 100, -20, 20)
      : 0;

    const score = clamp(
      Math.round(
        320 +
          savingsRate * 320 +
          (1 - expenseRatio) * 180 +
          Math.min(point.ingresos > 0 ? 120 : 0, 120) +
          trendBonus -
          debtLoadPenalty,
      ),
      0,
      1000,
    );

    return {
      month: point.month,
      score,
    };
  });
}

export async function buildGoalRecommendationContext(userId: number, goalId: number) {
  const { prisma } = await import("./prisma");
  const [goal, cuentas, deudas, transacciones, goalContributions] = await Promise.all([
    prisma.objetivoFinanciero.findFirst({
      where: { id: goalId, idUsuario: userId },
      include: {
        cuenta: { select: { id: true, nombre: true, saldoActual: true } },
      },
    }),
    prisma.cuenta.findMany({
      where: { idUsuario: userId },
      select: { nombre: true, saldoActual: true },
    }),
    prisma.deuda.findMany({
      where: { idUsuario: userId },
      select: { saldoPendiente: true, tasaIntereses: true, cuotas: true, cuotasPagadas: true },
    }),
    prisma.transaccion.findMany({
      where: { idUsuario: userId },
      select: { monto: true, fecha: true, esIngreso: true, idDeuda: true },
      orderBy: { fecha: "desc" },
    }),
    prisma.transaccion.aggregate({
      where: { idUsuario: userId, idObjetivo: goalId, esIngreso: false },
      _sum: { monto: true },
    }),
  ]);

  if (!goal) {
    return null;
  }

  const totalDebt = deudas.reduce((sum, debt) => sum + toNumber(debt.saldoPendiente), 0);
  const recentWindow = transacciones.filter((transaction) => {
    const elapsed = Date.now() - new Date(transaction.fecha).getTime();
    return elapsed <= 1000 * 60 * 60 * 24 * 90;
  });

  const incomeByMonth = recentWindow.filter((transaction) => transaction.esIngreso).reduce((acc, transaction) => {
    const key = monthKey(new Date(transaction.fecha));
    acc.set(key, (acc.get(key) ?? 0) + toNumber(transaction.monto));
    return acc;
  }, new Map<string, number>());

  const expenseByMonth = recentWindow.filter((transaction) => !transaction.esIngreso).reduce((acc, transaction) => {
    const key = monthKey(new Date(transaction.fecha));
    acc.set(key, (acc.get(key) ?? 0) + toNumber(transaction.monto));
    return acc;
  }, new Map<string, number>());

  const debtPaymentsByMonth = recentWindow.filter((transaction) => transaction.idDeuda).reduce((acc, transaction) => {
    const key = monthKey(new Date(transaction.fecha));
    acc.set(key, (acc.get(key) ?? 0) + toNumber(transaction.monto));
    return acc;
  }, new Map<string, number>());

  const lastThreeMonths = Array.from({ length: 3 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    return monthKey(date);
  });

  const monthlyIncome = average(lastThreeMonths.map((key) => incomeByMonth.get(key) ?? 0));
  const monthlyExpenses = average(lastThreeMonths.map((key) => expenseByMonth.get(key) ?? 0));
  const monthlyDebtCommitment = average(lastThreeMonths.map((key) => debtPaymentsByMonth.get(key) ?? 0));
  const monthlyDisposableIncome = Math.max(monthlyIncome - monthlyExpenses - monthlyDebtCommitment, 0);
  const debtPressure = monthlyIncome > 0 ? totalDebt / Math.max(monthlyIncome * 6, 1) : totalDebt > 0 ? 1 : 0;

  const currentAmount = toNumber(goalContributions._sum.monto);
  const remainingAmount = Math.max(toNumber(goal.montoMeta) - currentAmount, 0);
  const monthsLeft = monthsBetween(new Date(), new Date(goal.fechaLimite));

  const context = {
    id: goal.id,
    nombreObjetivo: goal.nombreObjetivo,
    montoMeta: toNumber(goal.montoMeta),
    fechaLimite: goal.fechaLimite.toISOString(),
    currentAmount,
    remainingAmount,
    monthsLeft,
    accountName: goal.cuenta?.nombre ?? null,
    accountBalance: goal.cuenta ? toNumber(goal.cuenta.saldoActual) : 0,
    monthlyIncome,
    monthlyExpenses,
    monthlyDebtCommitment,
    monthlyDisposableIncome,
    debtPressure,
  };

  const deterministicPlans = buildGoalPlans(context);
  const aiResult = await tryAiGoalPlan({
    context,
    plans: deterministicPlans,
    snapshot: {
      cuentas,
      deudas,
      transacciones,
    },
  });

    return {
      goal: context,
      plans: aiResult?.plans ?? deterministicPlans,
      aiUsed: Boolean(aiResult),
      summary:
        aiResult?.summary ??
        "Los planes se generaron con el perfil financiero actual, usando ingresos, gastos, deudas y el saldo disponible de la cuenta asociada.",
    } satisfies GoalRecommendationContext;
}

export async function buildScoreInsightContext(userId: number): Promise<ScoreInsightResponse> {
  const { prisma } = await import("./prisma");
  const [cuentas, transacciones, deudas] = await Promise.all([
    prisma.cuenta.findMany({
      where: { idUsuario: userId },
      select: { saldoActual: true },
    }),
    prisma.transaccion.findMany({
      where: { idUsuario: userId },
      select: { monto: true, fecha: true, esIngreso: true, idDeuda: true },
      orderBy: { fecha: "asc" },
    }),
    prisma.deuda.findMany({
      where: { idUsuario: userId },
      select: { saldoPendiente: true, tasaIntereses: true, cuotas: true, cuotasPagadas: true },
    }),
  ]);

  const historialPersistido = await prisma.scoreFinanciero.findMany({
    where: { idUsuario: userId },
    orderBy: { fechaCalculo: "desc" },
    take: 12,
    select: {
      id: true,
      fechaCalculo: true,
      puntaje: true,
      ratioGastoIngreso: true,
      capacidadAhorro: true,
      nivelRiesgo: { select: { nombre: true } },
    },
  });

  const accountBalance = cuentas.reduce((sum, account) => sum + toNumber(account.saldoActual), 0);
  const totalDebt = deudas.reduce((sum, debt) => sum + toNumber(debt.saldoPendiente), 0);
  const debtPayments = transacciones.filter((transaction) => transaction.idDeuda);

  const monthlyBuckets = new Map<
    string,
    { ingresos: number; gastos: number; pagosDeuda: number }
  >();

  for (const transaction of transacciones) {
    const key = monthKey(new Date(transaction.fecha));
    const bucket = monthlyBuckets.get(key) ?? { ingresos: 0, gastos: 0, pagosDeuda: 0 };

    if (transaction.esIngreso) {
      bucket.ingresos += toNumber(transaction.monto);
    } else if (transaction.idDeuda) {
      bucket.pagosDeuda += toNumber(transaction.monto);
    } else {
      bucket.gastos += toNumber(transaction.monto);
    }

    monthlyBuckets.set(key, bucket);
  }

  const currentDate = new Date();
  const months = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (6 - index), 1);
    return date;
  });

  const monthlyFlow = months.map((date) => {
    const key = monthKey(date);
    const bucket = monthlyBuckets.get(key) ?? { ingresos: 0, gastos: 0, pagosDeuda: 0 };
    const cashFlow = bucket.ingresos - bucket.gastos - bucket.pagosDeuda;

    return {
      month: monthLabel(date),
      ingresos: bucket.ingresos,
      gastos: bucket.gastos,
      pagosDeuda: bucket.pagosDeuda,
      ahorros: Math.max(cashFlow, 0),
    };
  });

  const savingsRates = monthlyFlow.map((month) =>
    month.ingresos > 0 ? month.ahorros / Math.max(month.ingresos, 1) : 0,
  );
  const averageSavingsRate = average(savingsRates);
  const expenseRates = monthlyFlow.map((month) =>
    month.ingresos > 0 ? (month.gastos + month.pagosDeuda) / Math.max(month.ingresos, 1) : 1,
  );
  const averageExpenseRate = average(expenseRates);

  const debtPressure =
    accountBalance + totalDebt > 0 ? totalDebt / Math.max(accountBalance + totalDebt, 1) : 0;
  const consistency = clamp(transacciones.length * 6, 0, 100);
  const accountHealth = clamp(accountBalance > 0 ? 45 + Math.min(accountBalance / 100000, 55) : 25, 0, 100);

  const monthlyScores = buildScoreFromMonthlyData(monthlyFlow, debtPressure);
  const currentScore = monthlyScores.at(-1)?.score ?? 300;
  const previousScore = monthlyScores.at(-2)?.score ?? currentScore;
  const scoreDiff = currentScore - previousScore;

  const averageMonthlyIncome = average(monthlyFlow.map((month) => month.ingresos));
  const averageMonthlyExpenses = average(monthlyFlow.map((month) => month.gastos));
  const averageMonthlyDebtPayments = average(monthlyFlow.map((month) => month.pagosDeuda));

  await persistScoreSnapshot({
    userId,
    score: currentScore,
    ratioGastoIngreso:
      averageMonthlyIncome > 0
        ? (averageMonthlyExpenses + averageMonthlyDebtPayments) / Math.max(averageMonthlyIncome, 1)
        : 1,
    capacidadAhorro: Math.max(averageMonthlyIncome - averageMonthlyExpenses - averageMonthlyDebtPayments, 0),
  });

  const debtFactor = clamp(Math.round((1 - debtPressure) * 100), 0, 100);
  const savingsFactor = clamp(Math.round(averageSavingsRate * 100), 0, 100);
  const spendingFactor = clamp(Math.round((1 - averageExpenseRate) * 100), 0, 100);

  const consejos = [
    averageSavingsRate < 0.15
      ? "Aumenta el ahorro automático al menos hasta el 15% de tus ingresos netos si tu flujo lo permite."
      : "Mantén el ahorro automático y revisa cada mes si puedes subir un poco el porcentaje.",
    debtPressure > 0.35
      ? "La deuda está pesando sobre tu salud financiera: prioriza las obligaciones con mayor tasa y evita financiar nuevos gastos."
      : "Tu nivel de deuda está bajo control, así que puedes usar parte del excedente para acelerar objetivos.",
    averageExpenseRate > 0.75
      ? "Tus gastos consumen gran parte del ingreso: identifica fugas pequeñas y gastos variables."
      : "El gasto está en un rango manejable, pero conviene seguirlo de cerca para que no suba.",
    accountBalance <= 0
      ? "Fortalece una reserva de liquidez para que los imprevistos no te obliguen a endeudarte."
      : "La base de liquidez existe; ahora conviene protegerla y hacer crecer el colchón.",
  ];

  const alertas = [
    scoreDiff < 0
      ? `El score bajó ${Math.abs(scoreDiff)} puntos frente al mes anterior.`
      : scoreDiff > 0
        ? `El score subió ${scoreDiff} puntos frente al mes anterior.`
        : "El score se mantuvo estable frente al mes anterior.",
    debtPayments.length > 0
      ? `Registraste ${debtPayments.length} movimientos ligados a deuda, lo que ayuda a seguir el avance.`
      : "No se detectaron pagos ligados a deudas en el periodo reciente.",
  ];

  const tendenciaDescripcion =
    scoreDiff > 0
      ? "Tu comportamiento financiero va mejorando y el flujo reciente acompaña esa tendencia."
      : scoreDiff < 0
        ? "Tu score viene cediendo; revisa gastos y deudas antes de que la tendencia se haga más fuerte."
        : "Tu score está estable; el siguiente salto dependerá de mejorar ahorro y disciplina de pagos.";

  return {
    scoreActual: currentScore,
    historial: monthlyScores,
    factores: [
      {
        nombre: "Capacidad de ahorro",
        valor: savingsFactor,
        descripcion: "Qué tanto del ingreso termina como ahorro mensual",
      },
      {
        nombre: "Gestión de deuda",
        valor: debtFactor,
        descripcion: "Peso actual de tus deudas frente a la liquidez disponible",
      },
      {
        nombre: "Control de gasto",
        valor: spendingFactor,
        descripcion: "Cuánto margen conservas después de gastos y pagos de deuda",
      },
      {
        nombre: "Consistencia de registros",
        valor: consistency,
        descripcion: "Frecuencia con la que registras movimientos en la app",
      },
      {
        nombre: "Salud de cuentas",
        valor: accountHealth,
        descripcion: "Estado agregado de los saldos disponibles",
      },
    ],
    flujo: monthlyFlow,
    consejos,
    alertas,
    tendencia: {
      variacion: scoreDiff,
      descripcion: tendenciaDescripcion,
    },
    historialPersistido: historialPersistido.map((registro) => ({
      id: registro.id,
      fechaCalculo: registro.fechaCalculo.toISOString(),
      puntaje: toNumber(registro.puntaje),
      ratioGastoIngreso: toNumber(registro.ratioGastoIngreso),
      capacidadAhorro: toNumber(registro.capacidadAhorro),
      nivelRiesgo: registro.nivelRiesgo?.nombre ?? null,
    })),
  };
}

export interface AiPlanResult {
  plans: GoalPlanVariant[];
  summary: string;
  adjusted?: boolean;
}
