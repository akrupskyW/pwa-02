"use client";

// Unified setup / fatal-config error screen. Two variants today:
//
//   • db-not-configured — DATABASE_URL is missing from the env. Surfaced
//     by the (app) layout's try/catch when `getPool()` throws
//     `DatabaseNotConfiguredError`.
//   • db-unreachable    — pg couldn't open a socket to the configured
//     host (DNS / refused / timeout). Surfaced by the same layout when
//     `query()` rewraps a libuv error as `DatabaseUnreachableError`.
//
// The same component is also used by app/(app)/error.tsx so a post-mount
// error from a page renders the same UI as the server-rendered fallback.

import type { ReactNode } from "react";

type Variant = { kind: "db-not-configured" } | { kind: "db-unreachable"; hostname?: string | null };

interface Props {
  variant: Variant;
  /** If provided, used as the Retry handler (e.g. error-boundary `reset`).
   *  Otherwise the button forces a full reload. */
  onRetry?: () => void;
}

interface ScreenCopy {
  /** Pill color token under @theme. */
  eyebrowColorClass: string;
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
  footnote?: ReactNode;
}

const dbNotConfiguredCopy = (): ScreenCopy => ({
  eyebrowColorClass: "text-accent-amber",
  eyebrow: "Setup required",
  title: "Database not configured",
  body: (
    <>
      <p className="text-ink-muted mt-3 text-[15px] leading-relaxed">
        This app reads <code className="text-ink font-mono">DATABASE_URL</code> from{" "}
        <code className="text-ink font-mono">.env.local</code>. Copy the template and fill in the
        connection string from the WISEintelligence user secret.
      </p>
      <pre className="border-line-subtle bg-ink-soft text-ink mt-5 overflow-x-auto rounded-s border p-4 text-[13px] leading-relaxed">
        <code className="font-mono">cp .env.local.example .env.local</code>
      </pre>
    </>
  ),
  footnote: (
    <>
      Next.js auto-reloads on <code className="font-mono">.env.local</code> changes — no dev server
      restart needed. Press Retry once the file is in place.
    </>
  ),
});

const dbUnreachableCopy = (hostname: string | null | undefined): ScreenCopy => {
  const looksLikePlaceholder =
    hostname === "HOST" || hostname === "host" || hostname === "USER" || hostname === "DBNAME";

  return {
    eyebrowColorClass: "text-accent-rose",
    eyebrow: "Database unreachable",
    title: hostname ? (
      <>
        Can&apos;t reach <span className="text-accent-amber font-mono">{hostname}</span>
      </>
    ) : (
      <>Can&apos;t reach the configured Postgres server</>
    ),
    body: (
      <>
        {looksLikePlaceholder ? (
          <p className="text-ink-muted mt-3 text-[15px] leading-relaxed">
            That hostname looks like the placeholder from{" "}
            <code className="text-ink font-mono">.env.local.example</code>. Open{" "}
            <code className="text-ink font-mono">.env.local</code> and replace the{" "}
            <code className="text-ink font-mono">USER</code>,{" "}
            <code className="text-ink font-mono">PASSWORD</code>,{" "}
            <code className="text-ink font-mono">HOST</code>, and{" "}
            <code className="text-ink font-mono">DBNAME</code> tokens with real values from your
            WISEintelligence user secret.
          </p>
        ) : (
          <p className="text-ink-muted mt-3 text-[15px] leading-relaxed">
            DNS or network couldn&apos;t open a socket to the configured host. Common fixes:
          </p>
        )}

        <ul className="text-ink-muted mt-4 space-y-2 text-[14px] leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="bg-accent-amber mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full" />
            <span>
              Confirm <code className="text-ink font-mono">DATABASE_URL</code> in{" "}
              <code className="text-ink font-mono">.env.local</code> is the form{" "}
              <code className="text-ink font-mono">postgresql://user:pass@host:5432/db</code>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-accent-amber mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full" />
            <span>If the database is behind a VPN, make sure you&apos;re connected.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-accent-amber mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full" />
            <span>For RDS / Aurora, verify the security group allows your current public IP.</span>
          </li>
        </ul>
      </>
    ),
    footnote: (
      <>
        Next.js auto-reloads on <code className="font-mono">.env.local</code> changes — no dev
        server restart needed. Press Retry once you&apos;ve fixed the connection string.
      </>
    ),
  };
};

// Exhaustiveness guard. If a new `Variant` is added without a matching
// case above, TypeScript will refuse to compile this line because the
// type of `v` won't narrow to `never`.
const assertNever = (v: never): never => {
  throw new Error(`Unhandled SetupErrorScreen variant: ${JSON.stringify(v)}`);
};

const copyForVariant = (v: Variant): ScreenCopy => {
  switch (v.kind) {
    case "db-not-configured":
      return dbNotConfiguredCopy();
    case "db-unreachable":
      return dbUnreachableCopy(v.hostname);
    default:
      return assertNever(v);
  }
};

export const SetupErrorScreen = ({ variant, onRetry }: Props) => {
  const copy = copyForVariant(variant);

  const handleRetry = () => {
    if (onRetry) onRetry();
    else if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-6 py-16">
      <div className="border-line bg-card shadow-bezel w-full max-w-xl rounded-l border p-8">
        <div
          className={`mb-3 inline-block text-[12px] font-bold tracking-[0.22em] uppercase ${copy.eyebrowColorClass}`}
        >
          {copy.eyebrow}
        </div>
        <h1 className="text-ink-bright text-2xl font-extrabold tracking-[-0.02em]">{copy.title}</h1>
        {copy.body}
        {copy.footnote ? (
          <p className="text-ink-faint mt-4 text-[13px] leading-relaxed">{copy.footnote}</p>
        ) : null}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-pill text-ink-soft shadow-cta-emerald inline-flex items-center gap-2 px-5 py-3 text-[14px] font-extrabold"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent-emerald) 0%, var(--color-accent-teal) 100%)",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    </main>
  );
};
