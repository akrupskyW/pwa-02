import { Pool } from "pg";

// Single shared pg Pool for the lifetime of the server process. Stored on
// globalThis so Next.js dev-mode hot reload doesn't keep spawning new pools
// (which would exhaust connection slots on the database).

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL not set. Copy .env.local.example to .env.local and fill in.",
      );
    }

    const max = process.env.DATABASE_POOL_MAX
      ? Number(process.env.DATABASE_POOL_MAX)
      : 10;

    globalForPg.__pgPool = new Pool({
      connectionString,
      max,
      // RDS / Aurora prefers TLS in production. Local Postgres usually doesn't.
      // Heuristic: enable TLS when the host looks like RDS.
      ssl: /\.rds\.amazonaws\.com/i.test(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });

    globalForPg.__pgPool.on("error", (err) => {
      // Idle client errors shouldn't crash the process; log and let the pool recover.
      console.error("[pg] idle client error:", err);
    });
  }
  return globalForPg.__pgPool;
}

// Convenience wrapper that also logs the SQL + params + elapsed time at
// debug-relevant log volume. Returns the typed rows directly. The TRow
// generic is intentionally unconstrained so callers can pass interfaces
// with specific keys rather than the open `{ [k]: any }` shape pg requires.
export async function query<TRow>(
  text: string,
  params: unknown[] = [],
  operation = "query",
): Promise<TRow[]> {
  const start = performance.now();
  try {
    const result = await getPool().query(text, params as never[]);
    const elapsed = Math.round(performance.now() - start);
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[db] ${operation} ${elapsed}ms rows=${result.rowCount}\n  params: ${formatParams(params)}\n  sql:\n${indent(text, "    ")}`,
      );
    }
    return result.rows as TRow[];
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    console.error(`[db] ${operation} FAILED after ${elapsed}ms:`, err);
    throw err;
  }
}

function formatParams(params: unknown[]): string {
  if (params.length === 0) return "(none)";
  return params
    .map((p, i) => `$${i + 1}=${formatParamValue(p)}`)
    .join(", ");
}

function formatParamValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) {
    return v.length <= 5
      ? `[${v.map(formatParamValue).join(",")}]`
      : `[${v.length} items: ${v.slice(0, 3).map(formatParamValue).join(",")},…]`;
  }
  if (typeof v === "string") return `'${v}'`;
  return String(v);
}

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => prefix + line.trimEnd())
    .join("\n");
}
