import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const updatePerfilSchema = z.object({
  nombre: z.string().min(2).max(200).optional(),
  apellido: z.string().min(2).max(200).optional(),
  numeroDocumento: z.string().max(200).nullable().optional(),
  idTipoDocumento: z.number().int().positive().nullable().optional(),
  idEstado: z.number().int().positive().nullable().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();

    const perfil = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        tipoDocumento: { select: { id: true, nombre: true } },
        estado: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(perfil);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const payload = updatePerfilSchema.parse(body);

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: {
        nombre: payload.nombre,
        apellido: payload.apellido,
        numeroDocumento:
          payload.numeroDocumento !== undefined
            ? payload.numeroDocumento
            : undefined,
        idTipoDocumento:
          payload.idTipoDocumento !== undefined
            ? payload.idTipoDocumento
            : undefined,
        idEstado: payload.idEstado !== undefined ? payload.idEstado : undefined,
      },
      include: {
        tipoDocumento: { select: { id: true, nombre: true } },
        estado: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
