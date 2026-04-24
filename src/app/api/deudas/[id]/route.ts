import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

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
