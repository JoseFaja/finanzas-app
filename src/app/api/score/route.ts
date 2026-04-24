import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export async function GET() {
  try {
    const userId = await requireUserId();

    const [cuentas, transacciones, deudas] = await Promise.all([
      prisma.cuenta.findMany({ where: { idUsuario: userId } }),
      prisma.transaccion.findMany({ where: { idUsuario: userId } }),
      prisma.deuda.findMany({ where: { idUsuario: userId } }),
    ]);

    const ingresos = transacciones
      .filter((t) => t.esIngreso)
      .reduce((acc, t) => acc + Number(t.monto), 0);
    const gastos = transacciones
      .filter((t) => !t.esIngreso)
      .reduce((acc, t) => acc + Number(t.monto), 0);
    const ahorro = Math.max(ingresos - gastos, 0);

    const ratioAhorro = ingresos > 0 ? Math.min((ahorro / ingresos) * 100, 100) : 0;
    const deudaTotal = deudas.reduce((acc, d) => acc + Number(d.saldoPendiente), 0);
    const activos = cuentas.reduce((acc, c) => acc + Number(c.saldoActual), 0);
    const ratioDeuda = deudaTotal > 0 ? Math.max(0, 100 - (deudaTotal / Math.max(activos, 1)) * 100) : 100;

    const scoreActual = Math.round(ratioAhorro * 4 + ratioDeuda * 3 + 300);

    const payload = {
      scoreActual: Math.max(0, Math.min(scoreActual, 1000)),
      historial: [
        { mes: "Oct", score: 680 },
        { mes: "Nov", score: 690 },
        { mes: "Dic", score: 705 },
        { mes: "Ene", score: 700 },
        { mes: "Feb", score: 720 },
        { mes: "Mar", score: 715 },
        { mes: "Abr", score: Math.max(0, Math.min(scoreActual, 1000)) },
      ],
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
          descripcion: "Historial de movimientos financieros",
        },
      ],
      flujo: [
        { mes: "Oct", ingresos: 4.5, gastos: 3.8, ahorros: 0.7 },
        { mes: "Nov", ingresos: 4.5, gastos: 3.7, ahorros: 0.8 },
        { mes: "Dic", ingresos: 5.2, gastos: 4.0, ahorros: 1.2 },
        { mes: "Ene", ingresos: 4.5, gastos: 3.5, ahorros: 1.0 },
        { mes: "Feb", ingresos: 5.8, gastos: 3.7, ahorros: 2.1 },
        { mes: "Mar", ingresos: 4.5, gastos: 3.4, ahorros: 1.1 },
        { mes: "Abr", ingresos: 4.5, gastos: 3.2, ahorros: 1.3 },
      ],
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
