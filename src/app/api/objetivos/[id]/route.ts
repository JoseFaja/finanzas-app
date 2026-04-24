import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const updateObjetivoSchema = z.object({
  nombreObjetivo: z.string().min(2).max(200).optional(),
  idTipoObjetivo: z.number().int().positive().optional(),
  montoMeta: z.number().finite().optional(),
  fechaLimite: z.string().datetime().optional(),
  idPrioridad: z.number().int().positive().nullable().optional(),
  idEstado: z.number().int().positive().nullable().optional(),
  idCuenta: z.number().int().positive().nullable().optional(),
});

function parseId(raw: string) {
  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("INVALID_ID");
  }

  return id;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const resolved = await params;
    const objetivoId = parseId(resolved.id);
    const body = await req.json();
    const payload = updateObjetivoSchema.parse(body);

    const existing = await prisma.objetivoFinanciero.findFirst({
      where: { id: objetivoId, idUsuario: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
    }

    if (payload.idCuenta) {
      const cuenta = await prisma.cuenta.findFirst({
        where: { id: payload.idCuenta, idUsuario: userId },
        select: { id: true },
      });

      if (!cuenta) {
        return NextResponse.json(
          { error: "La cuenta no pertenece al usuario" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.objetivoFinanciero.update({
      where: { id: objetivoId },
      data: {
        nombreObjetivo: payload.nombreObjetivo,
        idTipoObjetivo: payload.idTipoObjetivo,
        montoMeta: payload.montoMeta,
        fechaLimite: payload.fechaLimite
          ? new Date(payload.fechaLimite)
          : undefined,
        idPrioridad:
          payload.idPrioridad !== undefined ? payload.idPrioridad : undefined,
        idEstado: payload.idEstado !== undefined ? payload.idEstado : undefined,
        idCuenta: payload.idCuenta !== undefined ? payload.idCuenta : undefined,
      },
      include: {
        tipoObjetivo: { select: { id: true, nombre: true } },
        prioridad: { select: { id: true, nombre: true } },
        estado: { select: { id: true, nombre: true } },
        cuenta: { select: { id: true, nombre: true } },
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
    const objetivoId = parseId(resolved.id);

    const existing = await prisma.objetivoFinanciero.findFirst({
      where: { id: objetivoId, idUsuario: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
    }

    await prisma.objetivoFinanciero.delete({ where: { id: objetivoId } });

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
