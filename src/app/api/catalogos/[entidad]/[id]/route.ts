import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const updateSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  descripcion: z.string().min(1).max(200).optional(),
});

type CatalogEntity =
  | "tipo-cuenta"
  | "categoria"
  | "metodo-pago"
  | "frecuencia-pago"
  | "tipo-deuda"
  | "tipo-objetivo"
  | "prioridad"
  | "nivel-riesgo"
  | "estado"
  | "tipo-documento";

function parseEntity(value: string): CatalogEntity {
  const allowed: CatalogEntity[] = [
    "tipo-cuenta",
    "categoria",
    "metodo-pago",
    "frecuencia-pago",
    "tipo-deuda",
    "tipo-objetivo",
    "prioridad",
    "nivel-riesgo",
    "estado",
    "tipo-documento",
  ];

  if (!allowed.includes(value as CatalogEntity)) {
    throw new Error("INVALID_ENTITY");
  }

  return value as CatalogEntity;
}

function parseId(raw: string) {
  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("INVALID_ID");
  }

  return id;
}

async function updateCatalog(
  entity: CatalogEntity,
  id: number,
  payload: z.infer<typeof updateSchema>,
) {
  const value = payload.descripcion ?? payload.nombre;

  switch (entity) {
    case "tipo-cuenta":
      return prisma.tipoCuenta.update({ where: { id }, data: { nombre: value } });
    case "categoria":
      return prisma.categoria.update({
        where: { id },
        data: { descripcion: value },
      });
    case "metodo-pago":
      return prisma.metodoPago.update({ where: { id }, data: { nombre: value } });
    case "frecuencia-pago":
      return prisma.frecuenciaPago.update({
        where: { id },
        data: { nombre: value },
      });
    case "tipo-deuda":
      return prisma.tipoDeuda.update({ where: { id }, data: { nombre: value } });
    case "tipo-objetivo":
      return prisma.tipoObjetivo.update({ where: { id }, data: { nombre: value } });
    case "prioridad":
      return prisma.prioridad.update({ where: { id }, data: { nombre: value } });
    case "nivel-riesgo":
      return prisma.nivelRiesgo.update({ where: { id }, data: { nombre: value } });
    case "estado":
      return prisma.estado.update({ where: { id }, data: { nombre: value } });
    case "tipo-documento":
      return prisma.tipoDocumento.update({ where: { id }, data: { nombre: value } });
  }
}

async function deleteCatalog(entity: CatalogEntity, id: number) {
  switch (entity) {
    case "tipo-cuenta":
      return prisma.tipoCuenta.delete({ where: { id } });
    case "categoria":
      return prisma.categoria.delete({ where: { id } });
    case "metodo-pago":
      return prisma.metodoPago.delete({ where: { id } });
    case "frecuencia-pago":
      return prisma.frecuenciaPago.delete({ where: { id } });
    case "tipo-deuda":
      return prisma.tipoDeuda.delete({ where: { id } });
    case "tipo-objetivo":
      return prisma.tipoObjetivo.delete({ where: { id } });
    case "prioridad":
      return prisma.prioridad.delete({ where: { id } });
    case "nivel-riesgo":
      return prisma.nivelRiesgo.delete({ where: { id } });
    case "estado":
      return prisma.estado.delete({ where: { id } });
    case "tipo-documento":
      return prisma.tipoDocumento.delete({ where: { id } });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ entidad: string; id: string }> },
) {
  try {
    await requireUserId();
    const resolved = await params;
    const entity = parseEntity(resolved.entidad);
    const id = parseId(resolved.id);
    const body = await req.json();
    const payload = updateSchema.parse(body);

    const value = payload.descripcion ?? payload.nombre;

    if (!value) {
      return NextResponse.json(
        { error: "Debes enviar nombre o descripcion" },
        { status: 400 },
      );
    }

    const updated = await updateCatalog(entity, id, payload);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "INVALID_ENTITY") {
      return NextResponse.json(
        { error: "Catálogo no soportado" },
        { status: 400 },
      );
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
  { params }: { params: Promise<{ entidad: string; id: string }> },
) {
  try {
    await requireUserId();
    const resolved = await params;
    const entity = parseEntity(resolved.entidad);
    const id = parseId(resolved.id);

    await deleteCatalog(entity, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "INVALID_ENTITY") {
      return NextResponse.json(
        { error: "Catálogo no soportado" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_ID") {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "No se pudo eliminar. Revisa relaciones activas." },
      { status: 400 },
    );
  }
}
