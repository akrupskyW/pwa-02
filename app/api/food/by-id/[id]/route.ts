import { NextRequest, NextResponse } from "next/server";
import { scoreFoodById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const expressionIds = req.nextUrl.searchParams.getAll("expressionId");

  try {
    const food = await scoreFoodById(id, expressionIds);
    if (!food) return NextResponse.json({ food: null }, { status: 404 });
    return NextResponse.json({ food });
  } catch (err) {
    console.error("[api/food/by-id] failed:", err);
    return NextResponse.json({ error: "Failed to load food" }, { status: 500 });
  }
};
