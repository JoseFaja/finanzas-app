export interface DebtCalculationInput {
  montoTotal: unknown;
  saldoPendiente: unknown;
  tasaIntereses: unknown;
  cuotas: number;
  cuotasPagadas: number;
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export function calculateDebtPaidAmount(debt: DebtCalculationInput) {
  const total = toNumber(debt.montoTotal);
  const pending = toNumber(debt.saldoPendiente);

  if (!Number.isFinite(total) || !Number.isFinite(pending)) {
    return 0;
  }

  return Math.min(Math.max(total - pending, 0), Math.max(total, 0));
}

export function calculateDebtProgress(debt: DebtCalculationInput) {
  const total = toNumber(debt.montoTotal);

  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.min((calculateDebtPaidAmount(debt) / total) * 100, 100);
}

export function calculateEstimatedPaidInstallments(debt: DebtCalculationInput) {
  const progress = calculateDebtProgress(debt);

  if (!Number.isFinite(progress) || debt.cuotas <= 0) {
    return 0;
  }

  return Math.min(debt.cuotas, Math.floor((progress / 100) * debt.cuotas));
}

export function calculateEstimatedMonthlyPayment(debt: DebtCalculationInput) {
  const principal = toNumber(debt.saldoPendiente);
  const remainingInstallments = Math.max(debt.cuotas - debt.cuotasPagadas, 1);
  const monthlyRate = toNumber(debt.tasaIntereses) / 100;

  if (!Number.isFinite(principal) || principal <= 0) {
    return 0;
  }

  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) {
    return principal / remainingInstallments;
  }

  const factor = Math.pow(1 + monthlyRate, remainingInstallments);

  return (principal * monthlyRate * factor) / (factor - 1);
}

export function buildDebtCalculationSummary(debt: DebtCalculationInput) {
  const pagoMensualEstimado = calculateEstimatedMonthlyPayment(debt);

  return {
    montoPagado: calculateDebtPaidAmount(debt),
    progresoPago: calculateDebtProgress(debt),
    cuotasPagadasEstimadas: calculateEstimatedPaidInstallments(debt),
    pagoMensualEstimado,
    totalConInteresesEstimado: pagoMensualEstimado * Math.max(debt.cuotas - debt.cuotasPagadas, 0),
  };
}
