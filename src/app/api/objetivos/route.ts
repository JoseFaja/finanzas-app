import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const createObjetivoSchema = z.object({
  nombreObjetivo: z.string().min(2).max(200),
  idTipoObjetivo: z.number().int().positive(),
  montoMeta: z.number().finite().nonnegative(),
  fechaLimite: z.string().datetime(),
  idPrioridad: z.number().int().positive().optional(),
  idEstado: z.number().int().positive().optional(),
  idCuenta: z.number().int().positive().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();

    const [objetivos, aportes] = await Promise.all([
      prisma.objetivoFinanciero.findMany({
        where: { idUsuario: userId },
        include: {
          tipoObjetivo: { select: { id: true, nombre: true } },
          prioridad: { select: { id: true, nombre: true } },
          estado: { select: { id: true, nombre: true } },
          cuenta: { select: { id: true, nombre: true } },
        },
        orderBy: { id: "desc" },
      }),
      prisma.transaccion.groupBy({
        by: ["idObjetivo"],
        where: { idUsuario: userId, idObjetivo: { not: null }, esIngreso: false },
        _sum: { monto: true },
      }),
    ]);

    const aportesPorObjetivo = new Map(
      aportes.map((aporte) => [aporte.idObjetivo, Number(aporte._sum.monto ?? 0)]),
    );

    return NextResponse.json(
      objetivos.map((objetivo) => ({
        ...objetivo,
        montoAhorrado: aportesPorObjetivo.get(objetivo.id) ?? 0,
      })),
    );
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
    const payload = createObjetivoSchema.parse(body);

    const activeState =
      (await prisma.estado.findFirst({
        where: { nombre: { equals: "Activo", mode: "insensitive" } },
        select: { id: true },
      })) ??
      (await prisma.estado.findFirst({
        orderBy: { id: "asc" },
        select: { id: true },
      }));

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

    const objetivo = await prisma.objetivoFinanciero.create({
      data: {
        idUsuario: userId,
        nombreObjetivo: payload.nombreObjetivo,
        idTipoObjetivo: payload.idTipoObjetivo,
        montoMeta: payload.montoMeta,
        fechaLimite: new Date(payload.fechaLimite),
        idPrioridad: payload.idPrioridad,
        idEstado: activeState?.id ?? payload.idEstado,
        idCuenta: payload.idCuenta,
      },
      include: {
        tipoObjetivo: { select: { id: true, nombre: true } },
        prioridad: { select: { id: true, nombre: true } },
        estado: { select: { id: true, nombre: true } },
        cuenta: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({ ...objetivo, montoAhorrado: 0 }, { status: 201 });
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
