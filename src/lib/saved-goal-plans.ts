import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface SavedPlanSummary {
  id: number;
  idObjetivo: number | null;
  fechaGeneracion: string;
  ahorroSugerido: number;
  ingresoMensualEstimado: number;
  gastoMensualEstimado: number;
  nivelRiesgo: string;
  planElegido: string;
  planElegidoKey: "high" | "medium" | "low";
}

const savedPlanInclude = {
  nivelRiesgo: { select: { nombre: true } },
  estrategias: {
    select: { prioridad: { select: { nombre: true } } },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.PlanFinancieroInclude;

type SavedPlanRecord = Prisma.PlanFinancieroGetPayload<{
  include: typeof savedPlanInclude;
}>;

function toNumber(value: unknown) {
  return Number(value ?? 0);
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

export function planKeyFromPriorityName(value: string | null | undefined): "high" | "medium" | "low" {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized.includes("alto") || normalized.includes("alta") || normalized.includes("high")) {
    return "high";
  }

  if (normalized.includes("bajo") || normalized.includes("baja") || normalized.includes("low")) {
    return "low";
  }

  return "medium";
}

export function mapSavedPlan(plan: SavedPlanRecord): SavedPlanSummary {
  const planKey = planKeyFromPriorityName(plan.estrategias[0]?.prioridad?.nombre);

  return {
    id: plan.id,
    idObjetivo: plan.idObjetivo,
    fechaGeneracion: plan.fechaGeneracion.toISOString(),
    ahorroSugerido: toNumber(plan.ahorroSugerido),
    ingresoMensualEstimado: toNumber(plan.ingresoMensualEstimado),
    gastoMensualEstimado: toNumber(plan.gastoMensualEstimado),
    nivelRiesgo: plan.nivelRiesgo?.nombre ?? riskLabel(planKey),
    planElegido: strategyLabel(planKey),
    planElegidoKey: planKey,
  };
}

export async function getSavedPlansForGoal(
  userId: number,
  goalId: number,
  take = 3,
): Promise<SavedPlanSummary[]> {
  const plans = await prisma.planFinanciero.findMany({
    where: { idUsuario: userId, idObjetivo: goalId },
    include: savedPlanInclude,
    orderBy: { fechaGeneracion: "desc" },
    take,
  });

  return plans.map(mapSavedPlan);
}

export async function getLatestSavedPlanByGoal(userId: number) {
  const plans = await prisma.planFinanciero.findMany({
    where: { idUsuario: userId, idObjetivo: { not: null } },
    include: savedPlanInclude,
    orderBy: { fechaGeneracion: "desc" },
  });

  const latestByGoal = new Map<number, SavedPlanSummary>();

  for (const plan of plans) {
    if (plan.idObjetivo && !latestByGoal.has(plan.idObjetivo)) {
      latestByGoal.set(plan.idObjetivo, mapSavedPlan(plan));
    }
  }

  return latestByGoal;
}
