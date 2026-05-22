import { NextRequest, NextResponse } from "next/server";
import { scoreFoodByUpc } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ upc: string }> },
) {
  const { upc } = await params;
  const expressionIds = req.nextUrl.searchParams.getAll("expressionId");

  try {
    const food = await scoreFoodByUpc(upc, expressionIds);
    if (!food) return NextResponse.json({ food: null }, { status: 404 });
    return NextResponse.json({ food });
  } catch (err) {
    console.error("[api/food/by-upc] failed:", err);
    return NextResponse.json({ error: "Failed to look up UPC" }, { status: 500 });
  }
}
