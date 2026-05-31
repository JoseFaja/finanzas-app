import { NextResponse } from "next/server";
import { buildScoreInsightContext } from "@/lib/financial-insights";
import { requireUserId } from "@/lib/require-user";

export async function GET() {
  try {
    const userId = await requireUserId();
    const score = await buildScoreInsightContext(userId);

    return NextResponse.json(score);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
