import { NextResponse } from "next/server";
import { listSelectableExpressions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const GET = async () => {
  try {
    const codes = await listSelectableExpressions();
    return NextResponse.json({ codes });
  } catch (err) {
    console.error("[api/codes] failed:", err);
    return NextResponse.json({ error: "Failed to load codes" }, { status: 500 });
  }
};
