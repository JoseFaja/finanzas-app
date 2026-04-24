import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const createTransaccionSchema = z.object({
  idCuenta: z.number().int().positive(),
  idCategoria: z.number().int().positive().optional(),
  idMetodoPago: z.number().int().positive().optional(),
  idFrecuenciaPago: z.number().int().positive().optional(),
  idDeuda: z.number().int().positive().optional(),
  monto: z.number().finite(),
  descripcion: z.string().max(300).optional(),
  fecha: z.string().datetime().optional(),
  esIngreso: z.boolean().default(false),
});

export async function GET() {
  try {
    const userId = await requireUserId();

    const transacciones = await prisma.transaccion.findMany({
      where: { idUsuario: userId },
      include: {
        cuenta: { select: { id: true, nombre: true } },
        categoria: { select: { id: true, descripcion: true } },
        metodoPago: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json(transacciones);
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
    const payload = createTransaccionSchema.parse(body);

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

    const transaccion = await prisma.transaccion.create({
      data: {
        idUsuario: userId,
        idCuenta: payload.idCuenta,
        idCategoria: payload.idCategoria,
        idMetodoPago: payload.idMetodoPago,
        idFrecuenciaPago: payload.idFrecuenciaPago,
        idDeuda: payload.idDeuda,
        monto: payload.monto,
        descripcion: payload.descripcion,
        fecha: payload.fecha ? new Date(payload.fecha) : new Date(),
        esIngreso: payload.esIngreso,
      },
      include: {
        cuenta: { select: { id: true, nombre: true } },
        categoria: { select: { id: true, descripcion: true } },
        metodoPago: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(transaccion, { status: 201 });
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
