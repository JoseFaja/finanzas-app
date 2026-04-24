import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const createDeudaSchema = z.object({
  idTipoDeuda: z.number().int().positive(),
  montoTotal: z.number().finite(),
  saldoPendiente: z.number().finite(),
  tasaIntereses: z.number().finite(),
  cuotas: z.number().int().positive(),
  cuotasPagadas: z.number().int().min(0).default(0),
  idFrecuenciaPago: z.number().int().positive().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();

    const deudas = await prisma.deuda.findMany({
      where: { idUsuario: userId },
      include: {
        tipoDeuda: { select: { id: true, nombre: true } },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(deudas);
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
    const payload = createDeudaSchema.parse(body);

    const deuda = await prisma.deuda.create({
      data: {
        idUsuario: userId,
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
      },
    });

    return NextResponse.json(deuda, { status: 201 });
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
