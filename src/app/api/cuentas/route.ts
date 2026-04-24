import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const createCuentaSchema = z.object({
  nombre: z.string().min(2),
  idTipoCuenta: z.number().int().positive(),
  saldoActual: z.number().finite().default(0),
});

export async function GET() {
  try {
    const userId = await requireUserId();

    const cuentas = await prisma.cuenta.findMany({
      where: { idUsuario: userId },
      include: {
        tipoCuenta: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(cuentas);
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
    const payload = createCuentaSchema.parse(body);

    const cuenta = await prisma.cuenta.create({
      data: {
        idUsuario: userId,
        nombre: payload.nombre,
        idTipoCuenta: payload.idTipoCuenta,
        saldoActual: payload.saldoActual,
      },
      include: {
        tipoCuenta: {
          select: { id: true, nombre: true },
        },
      },
    });

    return NextResponse.json(cuenta, { status: 201 });
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
