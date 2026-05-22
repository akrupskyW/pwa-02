// POST /api/code/compose
//
// Body:   { description: string }
// Returns: { slots: [{ code, weight, expressionId }], tags: string[], rationale: string }
//
// Given the user's free-text description of what matters to them, ask the
// LLM to compose up to 5 slots (with weights summing to 100) and 3–4 short
// descriptive tags. The model works in code SLUGS only — we resolve slugs
// back to UUIDs server-side before returning so the client can dispatch
// SEED_SLOT actions without an extra lookup.

import { NextResponse } from "next/server";
import { listSelectableExpressions } from "@/lib/queries";
import { generateJson } from "@/lib/llm";
import {
  composeResponseSchema,
  composeSystemPrompt,
  composeUserPrompt,
  toCatalog,
} from "@/lib/code-prompts";

export const runtime = "nodejs";
// Don't cache — every description is unique.
export const dynamic = "force-dynamic";

interface Body {
  description?: string;
}

const MAX_DESCRIPTION_LENGTH = 1200;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const description = (body.description ?? "").trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Description must be ≤ ${MAX_DESCRIPTION_LENGTH} chars` },
      { status: 400 },
    );
  }

  const codes = await listSelectableExpressions();
  if (codes.length === 0) {
    return NextResponse.json({ error: "Catalog is empty" }, { status: 503 });
  }
  const catalog = toCatalog(codes);

  let composed;
  try {
    composed = await generateJson({
      system: composeSystemPrompt(),
      prompt: composeUserPrompt(description, catalog),
      schema: composeResponseSchema,
      schemaName: "ComposedCode",
      schemaDescription: "User's personalized nutrition rubric",
    });
  } catch (err) {
    console.error("[/api/code/compose] LLM call failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach the model. Try again." },
      { status: 502 },
    );
  }

  // Validate + normalize weights server-side, since the model can drift by
  // a few points even when instructed to sum to 100.
  const bySlug = new Map(codes.map((c) => [c.code, c]));
  const resolved = composed.slots
    .map((s) => ({ raw: s, code: bySlug.get(s.code) }))
    .filter((x): x is { raw: typeof composed.slots[number]; code: NonNullable<typeof x.code> } =>
      Boolean(x.code),
    );

  if (resolved.length === 0) {
    console.error(
      "[/api/code/compose] Model returned only slugs not in the catalog:",
      composed.slots.map((s) => s.code),
    );
    return NextResponse.json({ error: "Model returned unknown codes" }, { status: 502 });
  }

  const weights = resolved.map((r) => Math.max(1, Math.min(100, Math.round(r.raw.weight))));
  const sum = weights.reduce((a, b) => a + b, 0);
  // Rebalance to exactly 100 by scaling, then fix any rounding drift on
  // the largest slot.
  let adjusted = weights.map((w) => Math.round((w / sum) * 100));
  let drift = 100 - adjusted.reduce((a, b) => a + b, 0);
  if (drift !== 0) {
    const maxIdx = adjusted.indexOf(Math.max(...adjusted));
    adjusted = adjusted.map((w, i) => (i === maxIdx ? w + drift : w));
  }

  return NextResponse.json({
    slots: resolved.map((r, i) => ({
      expressionId: r.code.id,
      code: r.code.code,
      name: r.code.name,
      weight: adjusted[i],
    })),
    tags: composed.tags,
    rationale: composed.rationale,
  });
}
