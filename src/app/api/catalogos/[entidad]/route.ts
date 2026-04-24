import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const upsertSchema = z.object({
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

async function listCatalog(entity: CatalogEntity) {
  switch (entity) {
    case "tipo-cuenta":
      return prisma.tipoCuenta.findMany({ orderBy: { id: "asc" } });
    case "categoria":
      return prisma.categoria.findMany({ orderBy: { id: "asc" } });
    case "metodo-pago":
      return prisma.metodoPago.findMany({ orderBy: { id: "asc" } });
    case "frecuencia-pago":
      return prisma.frecuenciaPago.findMany({ orderBy: { id: "asc" } });
    case "tipo-deuda":
      return prisma.tipoDeuda.findMany({ orderBy: { id: "asc" } });
    case "tipo-objetivo":
      return prisma.tipoObjetivo.findMany({ orderBy: { id: "asc" } });
    case "prioridad":
      return prisma.prioridad.findMany({ orderBy: { id: "asc" } });
    case "nivel-riesgo":
      return prisma.nivelRiesgo.findMany({ orderBy: { id: "asc" } });
    case "estado":
      return prisma.estado.findMany({ orderBy: { id: "asc" } });
    case "tipo-documento":
      return prisma.tipoDocumento.findMany({ orderBy: { id: "asc" } });
  }
}

async function createCatalog(
  entity: CatalogEntity,
  payload: z.infer<typeof upsertSchema>,
) {
  const value = payload.descripcion ?? payload.nombre;

  if (!value) {
    throw new Error("MISSING_VALUE");
  }

  switch (entity) {
    case "tipo-cuenta":
      return prisma.tipoCuenta.create({ data: { nombre: value } });
    case "categoria":
      return prisma.categoria.create({ data: { descripcion: value } });
    case "metodo-pago":
      return prisma.metodoPago.create({ data: { nombre: value } });
    case "frecuencia-pago":
      return prisma.frecuenciaPago.create({ data: { nombre: value } });
    case "tipo-deuda":
      return prisma.tipoDeuda.create({ data: { nombre: value } });
    case "tipo-objetivo":
      return prisma.tipoObjetivo.create({ data: { nombre: value } });
    case "prioridad":
      return prisma.prioridad.create({ data: { nombre: value } });
    case "nivel-riesgo":
      return prisma.nivelRiesgo.create({ data: { nombre: value } });
    case "estado":
      return prisma.estado.create({ data: { nombre: value } });
    case "tipo-documento":
      return prisma.tipoDocumento.create({ data: { nombre: value } });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entidad: string }> },
) {
  try {
    await requireUserId();
    const resolved = await params;
    const entity = parseEntity(resolved.entidad);
    const items = await listCatalog(entity);

    return NextResponse.json(items);
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

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ entidad: string }> },
) {
  try {
    await requireUserId();
    const resolved = await params;
    const entity = parseEntity(resolved.entidad);
    const body = await req.json();
    const payload = upsertSchema.parse(body);

    const created = await createCatalog(entity, payload);

    return NextResponse.json(created, { status: 201 });
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

    if (error instanceof Error && error.message === "MISSING_VALUE") {
      return NextResponse.json(
        { error: "Debes enviar nombre o descripcion" },
        { status: 400 },
      );
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
