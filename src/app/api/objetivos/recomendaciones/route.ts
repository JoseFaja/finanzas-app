import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  buildGoalRecommendationContext,
  type GoalPlanVariant,
} from "@/lib/financial-insights";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const recommendationSchema = z.object({
  goalId: z.number().int().positive(),
  selectedPlanKey: z.enum(["high", "medium", "low"]).default("medium"),
  persist: z.boolean().default(true),
  monthlyContribution: z.number().positive().optional(),
  horizonMonths: z.number().int().positive().optional(),
});

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

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function strategyLabel(key: "high" | "medium" | "low") {
  if (key === "high") {
    return "Alto impacto";
  }

  if (key === "medium") {
    return "Impacto medio";
  }

  return "Bajo impacto";
}

function riskLabel(key: "high" | "medium" | "low") {
  if (key === "high") {
    return "Agresivo";
  }

  if (key === "medium") {
    return "Moderado";
  }

  return "Conservador";
}

function priorityNameForPlanKey(key: "high" | "medium" | "low") {
  if (key === "high") {
    return "Alto impacto";
  }

  if (key === "medium") {
    return "Impacto medio";
  }

  return "Bajo impacto";
}

function planKeyFromPriorityName(value: string | null | undefined): "high" | "medium" | "low" {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized.includes("alto") || normalized.includes("alta") || normalized.includes("high")) {
    return "high";
  }

  if (normalized.includes("bajo") || normalized.includes("baja") || normalized.includes("low")) {
    return "low";
  }

  return "medium";
}

function parseGoalId(value: string | null) {
  if (!value) {
    return null;
  }

  const goalId = Number(value);

  if (!Number.isInteger(goalId) || goalId <= 0) {
    return null;
  }

  return goalId;
}

async function resolveRecommendations(goalId: number) {
  const userId = await requireUserId();
  const context = await buildGoalRecommendationContext(userId, goalId);

  if (!context) {
    return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
  }

  const historialGuardado = await getSavedPlans(userId);

  return NextResponse.json({
    ...context,
    historialGuardado,
    planGuardado: historialGuardado[0] ?? null,
  });
}

async function getActiveStateId() {
  const activeState = await prisma.estado.findFirst({
    where: { nombre: { equals: "Activo", mode: "insensitive" } },
    select: { id: true },
  });

  if (activeState) {
    return activeState.id;
  }

  const firstState = await prisma.estado.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (firstState) {
    return firstState.id;
  }

  const created = await prisma.estado.create({
    data: { nombre: "Activo" },
    select: { id: true },
  });

  return created.id;
}

async function getRiskLevelId(planKey: GoalPlanVariant["key"]) {
  const riskName = riskLabel(planKey);

  const risk = await prisma.nivelRiesgo.findFirst({
    where: { nombre: { equals: riskName, mode: "insensitive" } },
    select: { id: true },
  });

  if (risk) {
    return risk.id;
  }

  const created = await prisma.nivelRiesgo.create({
    data: { nombre: riskName },
    select: { id: true },
  });

  return created.id;
}

async function getPriorityId(planKey: GoalPlanVariant["key"]) {
  const priorityName = priorityNameForPlanKey(planKey);

  const priority = await prisma.prioridad.findFirst({
    where: { nombre: { equals: priorityName, mode: "insensitive" } },
    select: { id: true },
  });

  if (priority) {
    return priority.id;
  }

  const created = await prisma.prioridad.create({
    data: { nombre: priorityName },
    select: { id: true },
  });

  return created.id;
}

async function getSavedPlans(userId: number): Promise<SavedPlanSummary[]> {
  const plans = await prisma.planFinanciero.findMany({
    where: { idUsuario: userId },
    include: {
      nivelRiesgo: { select: { nombre: true } },
      estrategias: {
        select: { prioridad: { select: { nombre: true } } },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { fechaGeneracion: "desc" },
    take: 3,
  });

  return plans.map((plan) => {
    const planKey = planKeyFromPriorityName(plan.estrategias[0]?.prioridad?.nombre);

    return {
      id: plan.id,
      fechaGeneracion: plan.fechaGeneracion.toISOString(),
      ahorroSugerido: toNumber(plan.ahorroSugerido),
      ingresoMensualEstimado: toNumber(plan.ingresoMensualEstimado),
      gastoMensualEstimado: toNumber(plan.gastoMensualEstimado),
      nivelRiesgo: plan.nivelRiesgo?.nombre ?? riskLabel(planKey),
      planElegido: strategyLabel(planKey),
      planElegidoKey: planKey,
      // aiAjustado intentionally not exposed anymore
    };
  });
}

async function persistRecommendationPlan(
  userId: number,
  context: NonNullable<Awaited<ReturnType<typeof buildGoalRecommendationContext>>>,
  selectedPlanKey: "high" | "medium" | "low",
  overrideMonthly?: number | null,
  overrideMonths?: number | null,
) {
  const basePlan = context.plans.find((plan) => plan.key === selectedPlanKey) ?? context.plans[0];
  const selectedPlan = {
    ...basePlan,
    monthlyContribution: typeof overrideMonthly === "number" ? overrideMonthly : basePlan.monthlyContribution,
    estimatedMonths: typeof overrideMonths === "number" ? overrideMonths : basePlan.estimatedMonths,
  } as typeof basePlan;
  const activeStateId = await getActiveStateId();
  const riskLevelId = await getRiskLevelId(selectedPlan.key);
  const priorityIdsByKey = await Promise.all(
    context.plans.map(async (plan) => [plan.key, await getPriorityId(plan.key)] as const),
  );
  const priorityIdByKey = new Map(priorityIdsByKey);
  const orderedPlans = [
    selectedPlan,
    ...context.plans.filter((plan) => plan.key !== selectedPlan.key),
  ];
  const estrategias = orderedPlans.map((plan) => {
    const priorityId = priorityIdByKey.get(plan.key);

    if (!priorityId) {
      throw new Error("INVALID_PRIORITY");
    }

    return {
      descripcion: truncate(
        `${plan.description} | Acciones: ${plan.actions.join("; ")} | Trade-offs: ${plan.tradeoffs.join("; ")}`,
        200,
      ),
      prioridad: { connect: { id: priorityId } },
    };
  });

  const savedPlan = await prisma.planFinanciero.create({
    data: {
      idUsuario: userId,
      ingresoMensualEstimado: new Prisma.Decimal(context.goal.monthlyIncome),
      gastoMensualEstimado: new Prisma.Decimal(context.goal.monthlyExpenses + context.goal.monthlyDebtCommitment),
      ahorroSugerido: new Prisma.Decimal(selectedPlan.monthlyContribution),
      aiAjustado: false,
      idNivelRiesgo: riskLevelId,
      idEstado: activeStateId,
      estrategias: {
        create: estrategias,
      },
    },
    include: {
      nivelRiesgo: { select: { nombre: true } },
      estrategias: {
        select: { prioridad: { select: { nombre: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  const savedPlanKey = planKeyFromPriorityName(savedPlan.estrategias[0]?.prioridad?.nombre);

  return {
    id: savedPlan.id,
    fechaGeneracion: savedPlan.fechaGeneracion.toISOString(),
    ahorroSugerido: toNumber(savedPlan.ahorroSugerido),
    ingresoMensualEstimado: toNumber(savedPlan.ingresoMensualEstimado),
    gastoMensualEstimado: toNumber(savedPlan.gastoMensualEstimado),
    nivelRiesgo: savedPlan.nivelRiesgo?.nombre ?? riskLabel(selectedPlan.key),
    planElegido: strategyLabel(savedPlanKey),
    planElegidoKey: savedPlanKey,
  } satisfies SavedPlanSummary;
}

export async function GET(request: Request) {
  try {
    const goalId = parseGoalId(new URL(request.url).searchParams.get("goalId"));

    if (!goalId) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    return await resolveRecommendations(goalId);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const payload = recommendationSchema.parse(body);

    const context = await buildGoalRecommendationContext(userId, payload.goalId);

    if (!context) {
      return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
    }

    // Only persist if explicitly requested; allow preview
    let planGuardado: SavedPlanSummary | null = null;
    if (payload.persist) {
      planGuardado = await persistRecommendationPlan(
        userId,
        context,
        payload.selectedPlanKey,
        payload.monthlyContribution ?? undefined,
        payload.horizonMonths ?? undefined,
      );
    }

    const historialGuardado = await getSavedPlans(userId);

    return NextResponse.json({
      ...context,
      planGuardado,
      historialGuardado,
      planAnterior: historialGuardado[1] ?? null,
      selectedPlanKey: planGuardado?.planElegidoKey ?? payload.selectedPlanKey,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
