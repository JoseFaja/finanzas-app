import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const updateTransaccionSchema = z.object({
  idCuenta: z.number().int().positive().optional(),
  idCategoria: z.number().int().positive().nullable().optional(),
  monto: z.number().finite().optional(),
  descripcion: z.string().max(300).nullable().optional(),
  fecha: z.string().datetime().optional(),
  esIngreso: z.boolean().optional(),
  metodoPago: z.string().max(100).nullable().optional(),
});

function parseId(params: { id: string }) {
  const transaccionId = Number(params.id);

  if (!Number.isInteger(transaccionId) || transaccionId <= 0) {
    throw new Error("INVALID_ID");
  }

  return transaccionId;
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
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 },
      );
    }

    if (payload.idCuenta) {
      const cuenta = await prisma.cuenta.findFirst({
        where: { id: payload.idCuenta, idUsuario: userId },
        select: { id: true },
      });

      if (!cuenta) {
        return NextResponse.json(
          { error: "Cuenta inválida para el usuario" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.transaccion.update({
      where: { id: transaccionId },
      data: {
        idCuenta: payload.idCuenta,
        idCategoria: payload.idCategoria ?? undefined,
        monto: payload.monto,
        descripcion:
          payload.descripcion !== undefined ? payload.descripcion : undefined,
        fecha: payload.fecha ? new Date(payload.fecha) : undefined,
        esIngreso: payload.esIngreso,
        metodoPago: payload.metodoPago !== undefined ? payload.metodoPago : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "INVALID_ID") {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
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
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 },
      );
    }

    await prisma.transaccion.delete({ where: { id: transaccionId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "INVALID_ID") {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
