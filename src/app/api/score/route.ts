import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("es-CO", { month: "short" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function currency(value: unknown) {
  return Number(value ?? 0);
}

export async function GET() {
  try {
    const userId = await requireUserId();

    const [cuentas, transacciones, deudas] = await Promise.all([
      prisma.cuenta.findMany({ where: { idUsuario: userId } }),
      prisma.transaccion.findMany({ where: { idUsuario: userId } }),
      prisma.deuda.findMany({ where: { idUsuario: userId } }),
    ]);

    const ingresos = transacciones
      .filter((transaction) => transaction.esIngreso)
      .reduce((sum, transaction) => sum + currency(transaction.monto), 0);
    const gastos = transacciones
      .filter((transaction) => !transaction.esIngreso)
      .reduce((sum, transaction) => sum + currency(transaction.monto), 0);
    const ahorro = Math.max(ingresos - gastos, 0);

    const ratioAhorro = ingresos > 0 ? Math.min((ahorro / ingresos) * 100, 100) : 0;
    const deudaTotal = deudas.reduce((sum, deuda) => sum + currency(deuda.saldoPendiente), 0);
    const activos = cuentas.reduce((sum, cuenta) => sum + currency(cuenta.saldoActual), 0);
    const ratioDeuda =
      deudaTotal > 0 ? Math.max(0, 100 - (deudaTotal / Math.max(activos, 1)) * 100) : 100;

    const currentDate = new Date();
    const months = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (6 - index), 1);
      return date;
    });

    const monthlyData = months.map((date) => {
      const key = monthKey(date);
      const monthTransactions = transacciones.filter((transaction) =>
        monthKey(new Date(transaction.fecha)) === key,
      );

      const monthIncome = monthTransactions
        .filter((transaction) => transaction.esIngreso)
        .reduce((sum, transaction) => sum + currency(transaction.monto), 0);
      const monthExpenses = monthTransactions
        .filter((transaction) => !transaction.esIngreso)
        .reduce((sum, transaction) => sum + currency(transaction.monto), 0);
      const monthSavings = Math.max(monthIncome - monthExpenses, 0);
      const monthScore = Math.max(
        0,
        Math.min(Math.round((monthIncome > 0 ? (monthSavings / Math.max(monthIncome, 1)) * 100 : 0) * 4 + ratioDeuda * 3 + 300), 1000),
      );

      return {
        month: monthLabel(date),
        score: monthScore,
        ingresos: monthIncome,
        gastos: monthExpenses,
        ahorros: monthSavings,
      };
    });

    const currentScore = monthlyData[monthlyData.length - 1]?.score ?? 300;

    return NextResponse.json({
      scoreActual: currentScore,
      historial: monthlyData.map(({ month, score }) => ({ month, score })),
      factores: [
        {
          nombre: "Ratio de ahorro",
          valor: Math.round(ratioAhorro),
          descripcion: "Capacidad de ahorro mensual",
        },
        {
          nombre: "Gestión de deudas",
          valor: Math.round(ratioDeuda),
          descripcion: "Relación entre deuda y activos",
        },
        {
          nombre: "Consistencia",
          valor: Math.min(transacciones.length * 5, 100),
          descripcion: "Historial de transacciones reales",
        },
      ],
      flujo: monthlyData.map(({ month, ingresos: monthIncome, gastos: monthExpenses, ahorros: monthSavings }) => ({
        month,
        ingresos: monthIncome,
        gastos: monthExpenses,
        ahorros: monthSavings,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
