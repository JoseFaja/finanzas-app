import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const updateTransaccionSchema = z.object({
  idCuenta: z.number().int().positive().optional(),
  idCategoria: z.number().int().positive().nullable().optional(),
  idMetodoPago: z.number().int().positive().nullable().optional(),
  idFrecuenciaPago: z.number().int().positive().nullable().optional(),
  idDeuda: z.number().int().positive().nullable().optional(),
  monto: z.number().finite().min(0).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  fecha: z.string().datetime().optional(),
  esIngreso: z.boolean().optional(),
});

function parseId(params: { id: string }) {
  const transaccionId = Number(params.id);

  if (!Number.isInteger(transaccionId) || transaccionId <= 0) {
    throw new Error("INVALID_ID");
  }

  return transaccionId;
}

function calculatePaidInstallments(
  montoTotal: Prisma.Decimal,
  saldoPendiente: Prisma.Decimal,
  cuotas: number,
) {
  if (cuotas <= 0 || montoTotal.lte(0)) {
    return 0;
  }

  const paidAmount = Prisma.Decimal.max(montoTotal.sub(saldoPendiente), new Prisma.Decimal(0));
  const installmentAmount = montoTotal.div(cuotas);

  return Math.min(cuotas, Math.floor(paidAmount.div(installmentAmount).toNumber()));
}

async function changeDebtBalance(
  tx: Prisma.TransactionClient,
  userId: number,
  debtId: number | null | undefined,
  amount: Prisma.Decimal,
  mode: "payment" | "reversal",
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

  const montoTotal = new Prisma.Decimal(deuda.montoTotal.toString());
  const currentDebtBalance = new Prisma.Decimal(deuda.saldoPendiente.toString());
  const nextDebtBalance =
    mode === "payment" ? currentDebtBalance.sub(amount) : currentDebtBalance.add(amount);

  if (nextDebtBalance.lt(0)) {
    throw new Error("DEBT_PAYMENT_EXCEEDS_BALANCE");
  }

  if (nextDebtBalance.gt(montoTotal)) {
    throw new Error("DEBT_BALANCE_EXCEEDS_TOTAL");
  }

  await tx.deuda.update({
    where: { id: deuda.id },
    data: {
      saldoPendiente: nextDebtBalance,
      cuotasPagadas: calculatePaidInstallments(montoTotal, nextDebtBalance, deuda.cuotas),
    },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const resolved = await params;
    const transaccionId = parseId(resolved);
    const body = await req.json();
    const payload = updateTransaccionSchema.parse(body);

    const existing = await prisma.transaccion.findFirst({
      where: { id: transaccionId, idUsuario: userId },
      include: { cuenta: { select: { id: true, saldoActual: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Transaccion no encontrada" },
        { status: 404 },
      );
    }

    const nextCuentaId = payload.idCuenta ?? existing.idCuenta;

    const updated = await prisma.$transaction(async (tx) => {
      const nextAmount =
        payload.monto !== undefined
          ? new Prisma.Decimal(payload.monto)
          : new Prisma.Decimal(existing.monto.toString());

      if (nextAmount.lt(0)) {
        throw new Error("INVALID_AMOUNT");
      }

      const nextIsIncome = payload.esIngreso ?? existing.esIngreso;
      const nextDebtId = payload.idDeuda !== undefined ? payload.idDeuda : existing.idDeuda;

      if (nextDebtId && nextIsIncome) {
        throw new Error("DEBT_PAYMENT_MUST_BE_EXPENSE");
      }

      const oldAmount = new Prisma.Decimal(existing.monto.toString());
      const oldEffect = existing.esIngreso ? oldAmount : oldAmount.neg();
      const newEffect = nextIsIncome ? nextAmount : nextAmount.neg();

      if (existing.idDeuda && !existing.esIngreso) {
        await changeDebtBalance(tx, userId, existing.idDeuda, oldAmount, "reversal");
      }

      if (nextDebtId && !nextIsIncome) {
        await changeDebtBalance(tx, userId, nextDebtId, nextAmount, "payment");
      }

      if (existing.idCuenta === nextCuentaId) {
        const currentAccount = await tx.cuenta.findFirst({
          where: { id: existing.idCuenta, idUsuario: userId },
          select: { id: true, saldoActual: true },
        });

        if (!currentAccount) {
          throw new Error("INVALID_ACCOUNT");
        }

        const currentBalance = new Prisma.Decimal(currentAccount.saldoActual.toString());
        const updatedBalance = currentBalance.sub(oldEffect).add(newEffect);

        if (updatedBalance.lt(0)) {
          throw new Error("NEGATIVE_BALANCE");
        }

        await tx.cuenta.update({
          where: { id: currentAccount.id },
          data: { saldoActual: updatedBalance },
        });
      } else {
        const currentAccount = await tx.cuenta.findFirst({
          where: { id: existing.idCuenta, idUsuario: userId },
          select: { id: true, saldoActual: true },
        });
        const nextAccount = await tx.cuenta.findFirst({
          where: { id: nextCuentaId, idUsuario: userId },
          select: { id: true, saldoActual: true },
        });

        if (!currentAccount || !nextAccount) {
          throw new Error("INVALID_ACCOUNT");
        }

        const currentBalance = new Prisma.Decimal(currentAccount.saldoActual.toString());
        const newCurrentBalance = currentBalance.sub(oldEffect);
        if (newCurrentBalance.lt(0)) {
          throw new Error("NEGATIVE_BALANCE");
        }

        await tx.cuenta.update({
          where: { id: currentAccount.id },
          data: { saldoActual: newCurrentBalance },
        });

        const targetBalance = new Prisma.Decimal(nextAccount.saldoActual.toString());
        const newTargetBalance = targetBalance.add(newEffect);
        if (newTargetBalance.lt(0)) {
          throw new Error("NEGATIVE_BALANCE");
        }

        await tx.cuenta.update({
          where: { id: nextCuentaId },
          data: { saldoActual: newTargetBalance },
        });
      }

      return tx.transaccion.update({
        where: { id: transaccionId },
        data: {
          idCuenta: nextCuentaId,
          idCategoria: payload.idCategoria !== undefined ? payload.idCategoria : undefined,
          monto: nextAmount,
          descripcion:
            payload.descripcion !== undefined ? payload.descripcion : undefined,
          fecha: payload.fecha ? new Date(payload.fecha) : undefined,
          esIngreso: nextIsIncome,
          idMetodoPago:
            payload.idMetodoPago !== undefined ? payload.idMetodoPago : undefined,
          idFrecuenciaPago:
            payload.idFrecuenciaPago !== undefined
              ? payload.idFrecuenciaPago
              : undefined,
          idDeuda: payload.idDeuda !== undefined ? payload.idDeuda : undefined,
        },
        include: {
          cuenta: { select: { id: true, nombre: true } },
          categoria: { select: { id: true, descripcion: true } },
          metodoPago: { select: { id: true, nombre: true } },
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

    return NextResponse.json(updated);
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
        { error: "La operacion dejaria la cuenta con saldo negativo" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_AMOUNT") {
      return NextResponse.json(
        { error: "El monto debe ser un numero mayor o igual a 0" },
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

    if (error instanceof Error && error.message === "DEBT_BALANCE_EXCEEDS_TOTAL") {
      return NextResponse.json(
        { error: "La deuda no puede quedar con saldo mayor al monto total" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_ID") {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const resolved = await params;
    const transaccionId = parseId(resolved);

    const existing = await prisma.transaccion.findFirst({
      where: { id: transaccionId, idUsuario: userId },
      include: {
        cuenta: { select: { id: true, saldoActual: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Transaccion no encontrada" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const amount = new Prisma.Decimal(existing.monto.toString());
      const effect = existing.esIngreso ? amount : amount.neg();
      const balance = new Prisma.Decimal(existing.cuenta.saldoActual.toString());

      if (existing.idDeuda && !existing.esIngreso) {
        await changeDebtBalance(tx, userId, existing.idDeuda, amount, "reversal");
      }

      const nextBalance = balance.sub(effect);
      if (nextBalance.lt(0)) {
        throw new Error("NEGATIVE_BALANCE");
      }

      await tx.cuenta.update({
        where: { id: existing.cuenta.id },
        data: { saldoActual: nextBalance },
      });

      await tx.transaccion.delete({ where: { id: transaccionId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "INVALID_ID") {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "NEGATIVE_BALANCE") {
      return NextResponse.json(
        { error: "La operacion dejaria la cuenta con saldo negativo" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "DEBT_BALANCE_EXCEEDS_TOTAL") {
      return NextResponse.json(
        { error: "La deuda no puede quedar con saldo mayor al monto total" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
