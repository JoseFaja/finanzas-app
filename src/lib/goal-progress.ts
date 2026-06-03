export interface GoalProgressInput {
  montoMeta: unknown;
  montoAhorrado?: unknown;
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export function calculateGoalProgress(goal: GoalProgressInput) {
  const target = toNumber(goal.montoMeta);
  const saved = toNumber(goal.montoAhorrado);

  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min((Math.max(saved, 0) / target) * 100, 100);
}

export function calculateGoalRemainingAmount(goal: GoalProgressInput) {
  return Math.max(toNumber(goal.montoMeta) - toNumber(goal.montoAhorrado), 0);
}
