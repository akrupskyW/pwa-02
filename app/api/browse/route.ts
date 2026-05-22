import { NextRequest, NextResponse } from "next/server";
import { browseFoods } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface BrowseBody {
  slots: { expressionId: string; weight: number }[];
  offset?: number;
  limit?: number;
}

export async function POST(req: NextRequest) {
  let body: BrowseBody;
  try {
    body = (await req.json()) as BrowseBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slots = Array.isArray(body.slots) ? body.slots : [];
  const offset = Math.max(0, Math.floor(body.offset ?? 0));
  const limit = Math.max(1, Math.min(100, Math.floor(body.limit ?? 20)));

  try {
    const page = await browseFoods(slots, offset, limit);
    return NextResponse.json(page);
  } catch (err) {
    console.error("[api/browse] failed:", err);
    return NextResponse.json({ error: "Failed to load browse page" }, { status: 500 });
  }
}
