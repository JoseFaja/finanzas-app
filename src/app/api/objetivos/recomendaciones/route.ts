import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  buildGoalRecommendationContext,
  type GoalPlanVariant,
  type RefinementAnswer,
} from "@/lib/financial-insights";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const recommendationSchema = z.object({
  goalId: z.number().int().positive(),
  selectedPlanKey: z.enum(["high", "medium", "low"]).default("medium"),
  answers: z
    .array(
      z.object({
        id: z.string().min(1),
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .default([]),
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

async function resolveRecommendations(goalId: number, answers: RefinementAnswer[]) {
  const userId = await requireUserId();
  const context = await buildGoalRecommendationContext(userId, goalId, answers);

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
  const activeState =
    (await prisma.estado.findFirst({
      where: { nombre: { equals: "Activo", mode: "insensitive" } },
      select: { id: true },
    })) ??
    (await prisma.estado.findFirst({
      orderBy: { id: "asc" },
      select: { id: true },
    }));

  return activeState?.id ?? null;
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

async function getSavedPlans(userId: number): Promise<SavedPlanSummary[]> {
  const plans = await prisma.planFinanciero.findMany({
    where: { idUsuario: userId },
    include: {
      nivelRiesgo: { select: { nombre: true } },
      estrategias: {
        select: { tipoEstrategia: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { fechaGeneracion: "desc" },
    take: 3,
  });

  return plans.map((plan) => ({
    id: plan.id,
    fechaGeneracion: plan.fechaGeneracion.toISOString(),
    ahorroSugerido: toNumber(plan.ahorroSugerido),
    ingresoMensualEstimado: toNumber(plan.ingresoMensualEstimado),
    gastoMensualEstimado: toNumber(plan.gastoMensualEstimado),
    nivelRiesgo: plan.nivelRiesgo?.nombre ?? riskLabel(plan.estrategias[0]?.tipoEstrategia === "high" ? "high" : plan.estrategias[0]?.tipoEstrategia === "low" ? "low" : "medium"),
    planElegido: strategyLabel(plan.estrategias[0]?.tipoEstrategia === "high" ? "high" : plan.estrategias[0]?.tipoEstrategia === "low" ? "low" : "medium"),
    planElegidoKey: plan.estrategias[0]?.tipoEstrategia === "high" ? "high" : plan.estrategias[0]?.tipoEstrategia === "low" ? "low" : "medium",
  }));
}

async function persistRecommendationPlan(
  userId: number,
  context: NonNullable<Awaited<ReturnType<typeof buildGoalRecommendationContext>>>,
  selectedPlanKey: "high" | "medium" | "low",
) {
  const selectedPlan = context.plans.find((plan) => plan.key === selectedPlanKey) ?? context.plans[0];
  const activeStateId = await getActiveStateId();
  const riskLevelId = await getRiskLevelId(selectedPlan.key);
  const orderedPlans = [
    selectedPlan,
    ...context.plans.filter((plan) => plan.key !== selectedPlan.key),
  ];

  const savedPlan = await prisma.planFinanciero.create({
    data: {
      idUsuario: userId,
      ingresoMensualEstimado: new Prisma.Decimal(context.goal.monthlyIncome),
      gastoMensualEstimado: new Prisma.Decimal(context.goal.monthlyExpenses + context.goal.monthlyDebtCommitment),
      ahorroSugerido: new Prisma.Decimal(selectedPlan.monthlyContribution),
      idNivelRiesgo: riskLevelId,
      idEstado: activeStateId,
      estrategias: {
        create: orderedPlans.map((plan) => ({
          descripcion: truncate(
            `${plan.description} | Acciones: ${plan.actions.join("; ")} | Trade-offs: ${plan.tradeoffs.join("; ")}`,
            200,
          ),
          tipoEstrategia: plan.key,
        })),
      },
    },
    include: {
      nivelRiesgo: { select: { nombre: true } },
      estrategias: {
        select: { tipoEstrategia: true },
        orderBy: { id: "asc" },
      },
    },
  });

  return {
    id: savedPlan.id,
    fechaGeneracion: savedPlan.fechaGeneracion.toISOString(),
    ahorroSugerido: toNumber(savedPlan.ahorroSugerido),
    ingresoMensualEstimado: toNumber(savedPlan.ingresoMensualEstimado),
    gastoMensualEstimado: toNumber(savedPlan.gastoMensualEstimado),
    nivelRiesgo: savedPlan.nivelRiesgo?.nombre ?? riskLabel(selectedPlan.key),
    planElegido: strategyLabel(savedPlan.estrategias[0]?.tipoEstrategia === "high" ? "high" : savedPlan.estrategias[0]?.tipoEstrategia === "low" ? "low" : "medium"),
    planElegidoKey: savedPlan.estrategias[0]?.tipoEstrategia === "high" ? "high" : savedPlan.estrategias[0]?.tipoEstrategia === "low" ? "low" : "medium",
  } satisfies SavedPlanSummary;
}

export async function GET(request: Request) {
  try {
    const goalId = parseGoalId(new URL(request.url).searchParams.get("goalId"));

    if (!goalId) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    return await resolveRecommendations(goalId, []);
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

    const context = await buildGoalRecommendationContext(userId, payload.goalId, payload.answers);

    if (!context) {
      return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
    }

    const planGuardado = await persistRecommendationPlan(userId, context, payload.selectedPlanKey);
    const historialGuardado = await getSavedPlans(userId);

    return NextResponse.json({
      ...context,
      planGuardado,
      historialGuardado,
      planAnterior: historialGuardado[1] ?? null,
      selectedPlanKey: planGuardado.planElegidoKey,
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