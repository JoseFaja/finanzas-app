import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const updateCuentaSchema = z.object({
  nombre: z.string().min(2).optional(),
  idTipoCuenta: z.number().int().positive().optional(),
  saldoActual: z.number().finite().optional(),
});

function parseId(params: { id: string }) {
  const cuentaId = Number(params.id);

  if (!Number.isInteger(cuentaId) || cuentaId <= 0) {
    throw new Error("INVALID_ID");
  }

  return cuentaId;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const resolved = await params;
    const cuentaId = parseId(resolved);
    const body = await req.json();
    const payload = updateCuentaSchema.parse(body);

    const existing = await prisma.cuenta.findFirst({
      where: { id: cuentaId, idUsuario: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    const updated = await prisma.cuenta.update({
      where: { id: cuentaId },
      data: payload,
      include: {
        tipoCuenta: {
          select: { id: true, nombre: true },
        },
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
    const cuentaId = parseId(resolved);

    const existing = await prisma.cuenta.findFirst({
      where: { id: cuentaId, idUsuario: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    await prisma.cuenta.delete({ where: { id: cuentaId } });

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
