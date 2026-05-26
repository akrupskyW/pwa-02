// POST /api/code/tags
//
// Body:   { slots: [{ code: string, weight: number }] }
// Returns: { tags: string[] }
//
// Given the user's CURRENT slot configuration (codes + weights summing to
// 100), ask the LLM to produce 3–4 short descriptive tags. Used to refresh
// the AI tag row after the user manually edits weights or swaps a code.

import { NextResponse } from "next/server";
import { listSelectableExpressions } from "@/lib/queries";
import { generateJson } from "@/lib/llm";
import {
  tagsResponseSchema,
  tagsSystemPrompt,
  tagsUserPrompt,
  toCatalog,
} from "@/lib/code-prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingSlot {
  code?: string;
  weight?: number;
}

interface Body {
  slots?: IncomingSlot[];
}

export const POST = async (req: Request) => {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const incoming = Array.isArray(body.slots) ? body.slots : [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "Provide at least one slot" }, { status: 400 });
  }

  const codes = await listSelectableExpressions();
  const bySlug = new Map(codes.map((c) => [c.code, c]));
  const slots = incoming
    .map((s) => {
      const code = s.code ? bySlug.get(s.code) : undefined;
      if (!code) return null;
      const weight = Math.max(1, Math.min(100, Math.round(s.weight ?? 0)));
      return { code: code.code, name: code.name, category: code.category, weight };
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  if (slots.length === 0) {
    return NextResponse.json({ error: "No valid slots in payload" }, { status: 400 });
  }

  const catalog = toCatalog(codes);

  try {
    const out = await generateJson({
      system: tagsSystemPrompt(),
      prompt: tagsUserPrompt(slots, catalog),
      schema: tagsResponseSchema,
      schemaName: "CodeTags",
      schemaDescription: "Three or four short descriptors of the current rubric",
    });
    return NextResponse.json({ tags: out.tags });
  } catch (err) {
    console.error("[/api/code/tags] LLM call failed:", err);
    return NextResponse.json({ error: "Couldn't reach the model. Try again." }, { status: 502 });
  }
};
