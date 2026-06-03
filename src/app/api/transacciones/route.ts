import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { calculateEstimatedPaidInstallments } from "@/lib/debt-calculations";

const createTransaccionSchema = z.object({
  idCuenta: z.number().int().positive(),
  idCategoria: z.number().int().positive().optional(),
  idMetodoPago: z.number().int().positive().optional(),
  idFrecuenciaPago: z.number().int().positive().optional(),
  idDeuda: z.number().int().positive().optional(),
  idObjetivo: z.number().int().positive().optional(),
  monto: z.number().finite().nonnegative(),
  descripcion: z.string().max(300).optional(),
  fecha: z.string().datetime().optional(),
  esIngreso: z.boolean().default(false),
});

async function validateObjectiveContribution(
  tx: Prisma.TransactionClient,
  userId: number,
  objectiveId: number | undefined,
  accountId: number,
  isIncome: boolean,
) {
  if (!objectiveId) {
    return;
  }

  if (isIncome) {
    throw new Error("OBJECTIVE_PAYMENT_MUST_BE_EXPENSE");
  }

  const objetivo = await tx.objetivoFinanciero.findFirst({
    where: { id: objectiveId, idUsuario: userId },
    select: { id: true, idCuenta: true },
  });

  if (!objetivo) {
    throw new Error("INVALID_OBJECTIVE");
  }

  if (objetivo.idCuenta && objetivo.idCuenta !== accountId) {
    throw new Error("OBJECTIVE_ACCOUNT_MISMATCH");
  }
}

async function applyDebtPayment(
  tx: Prisma.TransactionClient,
  userId: number,
  debtId: number | undefined,
  amount: Prisma.Decimal,
) {
  if (!debtId) {
    return;
  }

  const deuda = await tx.deuda.findFirst({
    where: { id: debtId, idUsuario: userId },
    select: { id: true, montoTotal: true, saldoPendiente: true, cuotas: true },
  });

  if (!deuda) {
    throw new Error("INVALID_DEBT");
  }

  const currentDebtBalance = new Prisma.Decimal(deuda.saldoPendiente.toString());
  const nextDebtBalance = currentDebtBalance.sub(amount);

  if (nextDebtBalance.lt(0)) {
    throw new Error("DEBT_PAYMENT_EXCEEDS_BALANCE");
  }

  await tx.deuda.update({
    where: { id: deuda.id },
    data: {
      saldoPendiente: nextDebtBalance,
      cuotasPagadas: calculateEstimatedPaidInstallments({
        montoTotal: deuda.montoTotal,
        saldoPendiente: nextDebtBalance,
        tasaIntereses: 0,
        cuotas: deuda.cuotas,
        cuotasPagadas: 0,
      }),
    },
  });
}

export async function GET() {
  try {
    const userId = await requireUserId();

    const transacciones = await prisma.transaccion.findMany({
      where: { idUsuario: userId },
      include: {
        cuenta: { select: { id: true, nombre: true } },
        categoria: { select: { id: true, descripcion: true } },
        metodoPago: { select: { id: true, nombre: true } },
        objetivo: { select: { id: true, nombreObjetivo: true } },
        deuda: {
          select: {
            id: true,
            saldoPendiente: true,
            tipoDeuda: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json(transacciones);
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
    const payload = createTransaccionSchema.parse(body);

    const transaccion = await prisma.$transaction(async (tx) => {
      const cuenta = await tx.cuenta.findFirst({
        where: { id: payload.idCuenta, idUsuario: userId },
        select: { id: true, saldoActual: true },
      });

      if (!cuenta) {
        throw new Error("INVALID_ACCOUNT");
      }

      const monto = new Prisma.Decimal(payload.monto);

      if (payload.idDeuda && payload.idObjetivo) {
        throw new Error("TRANSACTION_TARGET_CONFLICT");
      }

      if (payload.idDeuda && payload.esIngreso) {
        throw new Error("DEBT_PAYMENT_MUST_BE_EXPENSE");
      }

      await validateObjectiveContribution(
        tx,
        userId,
        payload.idObjetivo,
        payload.idCuenta,
        payload.esIngreso,
      );

      const signedAmount = payload.esIngreso ? monto : monto.neg();
      const currentBalance = new Prisma.Decimal(cuenta.saldoActual.toString());

      const nextBalance = currentBalance.add(signedAmount);
      if (nextBalance.lt(0)) {
        throw new Error("NEGATIVE_BALANCE");
      }

      await tx.cuenta.update({
        where: { id: cuenta.id },
        data: { saldoActual: nextBalance },
      });

      await applyDebtPayment(tx, userId, payload.idDeuda, monto);

      return tx.transaccion.create({
        data: {
          idUsuario: userId,
          idCuenta: payload.idCuenta,
          idCategoria: payload.idCategoria,
          idMetodoPago: payload.idMetodoPago,
          idFrecuenciaPago: payload.idFrecuenciaPago,
          idDeuda: payload.idDeuda,
          idObjetivo: payload.idObjetivo,
          monto,
          descripcion: payload.descripcion,
          fecha: payload.fecha ? new Date(payload.fecha) : new Date(),
          esIngreso: payload.esIngreso,
        },
        include: {
          cuenta: { select: { id: true, nombre: true } },
          categoria: { select: { id: true, descripcion: true } },
          metodoPago: { select: { id: true, nombre: true } },
          objetivo: { select: { id: true, nombreObjetivo: true } },
          deuda: {
            select: {
              id: true,
              saldoPendiente: true,
              tipoDeuda: { select: { nombre: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(transaccion, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "INVALID_ACCOUNT") {
      return NextResponse.json(
        { error: "Cuenta invalida para el usuario" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "NEGATIVE_BALANCE") {
      return NextResponse.json(
        { error: "La transaccion dejaria la cuenta con saldo negativo" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_DEBT") {
      return NextResponse.json(
        { error: "Deuda invalida para el usuario" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "DEBT_PAYMENT_MUST_BE_EXPENSE") {
      return NextResponse.json(
        { error: "Los abonos a deuda deben registrarse como gasto" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "DEBT_PAYMENT_EXCEEDS_BALANCE") {
      return NextResponse.json(
        { error: "El abono no puede superar el saldo pendiente de la deuda" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "TRANSACTION_TARGET_CONFLICT") {
      return NextResponse.json(
        { error: "La transaccion no puede estar asociada a deuda y objetivo al mismo tiempo" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_OBJECTIVE") {
      return NextResponse.json(
        { error: "Objetivo invalido para el usuario" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "OBJECTIVE_PAYMENT_MUST_BE_EXPENSE") {
      return NextResponse.json(
        { error: "Los abonos a objetivo deben registrarse como gasto" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "OBJECTIVE_ACCOUNT_MISMATCH") {
      return NextResponse.json(
        { error: "La cuenta no coincide con la cuenta asociada al objetivo" },
        { status: 400 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos invalidos", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
