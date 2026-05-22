// Thin LLM gateway. The rest of the app talks to this module; this module
// talks to the Vercel AI SDK; the SDK talks to OpenAI or Anthropic.
//
// Why the indirection:
//   1. Provider swap is one env var (LLM_PROVIDER=openai|anthropic). No
//      caller changes when we move between gpt-5 and claude-opus-4-7.
//   2. Structured output via Zod stays in one place — every call returns
//      validated JSON or throws. No "parse the model's prose back into
//      JSON" fragility.
//   3. Lazy provider import keeps the unused provider's chunk out of the
//      route bundle on Vercel.

import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import type { z } from "zod";

export type LlmProvider = "openai" | "anthropic";

function provider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (raw === "anthropic") return "anthropic";
  return "openai";
}

async function resolveModel(): Promise<LanguageModel> {
  const which = provider();
  if (which === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set in .env.local.",
      );
    }
    const { anthropic } = await import("@ai-sdk/anthropic");
    const modelId = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
    return anthropic(modelId);
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "LLM_PROVIDER=openai but OPENAI_API_KEY is not set in .env.local.",
    );
  }
  const { openai } = await import("@ai-sdk/openai");
  const modelId = process.env.OPENAI_MODEL ?? "gpt-5";
  return openai(modelId);
}

interface CallArgs<T> {
  /** System / role prompt — the constant context. */
  system: string;
  /** User-turn content — the specific request. */
  prompt: string;
  /** Zod schema describing the expected JSON return shape. */
  schema: z.ZodType<T>;
  /** Optional schema name + description that the model sees. */
  schemaName?: string;
  schemaDescription?: string;
  /** 0..1. Omitted by default — reasoning models (gpt-5, o-series) reject
   *  temperature with a warning. Set only when calling a non-reasoning
   *  model that benefits from extra variability. */
  temperature?: number;
}

/** Single entry point for the rest of the app. Returns validated JSON
 *  matching the schema, or throws (caller renders an error state). */
export async function generateJson<T>(args: CallArgs<T>): Promise<T> {
  const model = await resolveModel();
  const result = await generateObject({
    model,
    system: args.system,
    prompt: args.prompt,
    // The AI SDK is picky about how it narrows schema → output type. We
    // know the schema validates T, so cast through to keep the public
    // signature clean.
    schema: args.schema as z.ZodType<T>,
    schemaName: args.schemaName,
    schemaDescription: args.schemaDescription,
    // Pass temperature only when the caller explicitly set it — reasoning
    // models (gpt-5, o-series) reject the field outright.
    ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
    output: "object",
  });
  return result.object as T;
}

/** Exposed for log lines / route handlers that want to surface which
 *  provider was used (e.g. for cost telemetry). */
export function currentProvider(): LlmProvider {
  return provider();
}
