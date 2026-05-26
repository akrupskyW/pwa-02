import { Pool } from "pg";

// Single shared pg Pool for the lifetime of the server process. Stored on
// globalThis so Next.js dev-mode hot reload doesn't keep spawning new pools
// (which would exhaust connection slots on the database).

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

/** Thrown when `DATABASE_URL` is missing from the environment. The (app)
 *  route group's error boundary recognizes this and renders a friendly
 *  setup screen instead of a stack trace. */
export class DatabaseNotConfiguredError extends Error {
  readonly code = "DATABASE_NOT_CONFIGURED" as const;
  constructor() {
    super("DATABASE_URL not set. Copy .env.local.example to .env.local and fill in.");
    this.name = "DatabaseNotConfiguredError";
  }
}

/** Thrown when the pg client can't reach the configured host — typically a
 *  bad hostname (still the `HOST` placeholder), wrong port, server down, or
 *  VPN not connected. We wrap the underlying network error so the UI layer
 *  can render a targeted help screen without sniffing libuv error codes. */
export class DatabaseUnreachableError extends Error {
  readonly code = "DATABASE_UNREACHABLE" as const;
  readonly hostname: string | null;
  override readonly cause: unknown;
  constructor(cause: unknown, hostname: string | null) {
    super(
      hostname
        ? `Could not reach the Postgres host "${hostname}". Check that DATABASE_URL points at a reachable server (VPN connected, hostname correct, port open).`
        : "Could not reach the configured Postgres server. Check DATABASE_URL.",
    );
    this.name = "DatabaseUnreachableError";
    this.hostname = hostname;
    this.cause = cause;
  }
}

interface NetworkErrno {
  code?: string;
  hostname?: string;
}

const NETWORK_ERROR_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

const isNetworkError = (err: unknown): err is NetworkErrno =>
  typeof err === "object" &&
  err !== null &&
  typeof (err as NetworkErrno).code === "string" &&
  NETWORK_ERROR_CODES.has((err as NetworkErrno).code as string);

const hostFromConnectionString = (raw: string | undefined): string | null => {
  if (!raw) return null;
  try {
    return new URL(raw).hostname || null;
  } catch {
    return null;
  }
};

export const getPool = (): Pool => {
  if (!globalForPg.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new DatabaseNotConfiguredError();
    }

    const max = process.env.DATABASE_POOL_MAX ? Number(process.env.DATABASE_POOL_MAX) : 10;

    globalForPg.__pgPool = new Pool({
      connectionString,
      max,
      // RDS / Aurora prefers TLS in production. Local Postgres usually doesn't.
      // Heuristic: enable TLS when the host looks like RDS.
      ssl: /\.rds\.amazonaws\.com/i.test(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });

    globalForPg.__pgPool.on("error", (err: NodeJS.ErrnoException) => {
      // Idle / connect-time client errors shouldn't crash the process.
      // Known network failures are reported via DatabaseUnreachableError
      // from the catch in `query()` — no need to also surface them here
      // (that would trigger Next's dev overlay alongside our friendly
      // screen). Real, unexpected errors still log loudly.
      if (err.code && NETWORK_ERROR_CODES.has(err.code)) {
        console.warn(`[pg] connection error (code=${err.code})`);
        return;
      }
      console.error("[pg] idle client error:", err);
    });
  }
  return globalForPg.__pgPool;
};

// Convenience wrapper that also logs the SQL + params + elapsed time at
// debug-relevant log volume. Returns the typed rows directly. The TRow
// generic is intentionally unconstrained so callers can pass interfaces
// with specific keys rather than the open `{ [k]: any }` shape pg requires.
export const query = async <TRow>(
  text: string,
  params: unknown[] = [],
  operation = "query",
): Promise<TRow[]> => {
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
    // Known config / connectivity errors are surfaced as friendly screens
    // by the (app) layout. Use `console.warn` (not `error`) for these so
    // Next's dev overlay doesn't pop on top of the screen. Genuinely
    // unexpected errors still get the loud `console.error` treatment.
    if (err instanceof DatabaseNotConfiguredError) {
      console.warn(`[db] ${operation} aborted: DATABASE_URL not set`);
      throw err;
    }
    if (isNetworkError(err)) {
      delete globalForPg.__pgPool;
      const host =
        (err as NetworkErrno).hostname ?? hostFromConnectionString(process.env.DATABASE_URL);
      console.warn(
        `[db] ${operation} unreachable after ${elapsed}ms (host=${host ?? "?"}, code=${(err as NetworkErrno).code})`,
      );
      throw new DatabaseUnreachableError(err, host);
    }
    console.error(`[db] ${operation} FAILED after ${elapsed}ms:`, err);
    throw err;
  }
};

const formatParams = (params: unknown[]): string => {
  if (params.length === 0) return "(none)";
  return params.map((p, i) => `$${i + 1}=${formatParamValue(p)}`).join(", ");
};

const formatParamValue = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) {
    return v.length <= 5
      ? `[${v.map(formatParamValue).join(",")}]`
      : `[${v.length} items: ${v.slice(0, 3).map(formatParamValue).join(",")},…]`;
  }
  if (typeof v === "string") return `'${v}'`;
  return String(v);
};

const indent = (text: string, prefix: string): string => {
  return text
    .split("\n")
    .map((line) => prefix + line.trimEnd())
    .join("\n");
};
