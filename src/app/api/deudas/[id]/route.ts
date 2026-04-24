import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const updateDebtSchema = z.object({
  idTipoDeuda: z.number().int().positive().optional(),
  montoTotal: z.number().finite().optional(),
  saldoPendiente: z.number().finite().optional(),
  tasaIntereses: z.number().finite().optional(),
  cuotas: z.number().int().positive().optional(),
  cuotasPagadas: z.number().int().nonnegative().optional(),
  idFrecuenciaPago: z.number().int().positive().nullable().optional(),
});

function parseId(raw: string) {
  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("INVALID_ID");
  }

  return id;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const resolved = await params;
    const deudaId = parseId(resolved.id);

    const existing = await prisma.deuda.findFirst({
      where: { id: deudaId, idUsuario: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deuda no encontrada" }, { status: 404 });
    }

    await prisma.deuda.delete({ where: { id: deudaId } });

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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const resolved = await params;
    const deudaId = parseId(resolved.id);
    const body = await req.json();
    const payload = updateDebtSchema.parse(body);

    const existing = await prisma.deuda.findFirst({
      where: { id: deudaId, idUsuario: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deuda no encontrada" }, { status: 404 });
    }

    const deuda = await prisma.deuda.update({
      where: { id: deudaId },
      data: {
        idTipoDeuda: payload.idTipoDeuda,
        montoTotal: payload.montoTotal,
        saldoPendiente: payload.saldoPendiente,
        tasaIntereses: payload.tasaIntereses,
        cuotas: payload.cuotas,
        cuotasPagadas: payload.cuotasPagadas,
        idFrecuenciaPago: payload.idFrecuenciaPago,
      },
      include: {
        tipoDeuda: { select: { id: true, nombre: true } },
        frecuenciaPago: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(deuda);
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
