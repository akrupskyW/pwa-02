"use client";

import { useEffect } from "react";

import { SetupErrorScreen } from "@/components/SetupErrorScreen";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

const isDbNotConfigured = (err: Error): boolean =>
  err.name === "DatabaseNotConfiguredError" || err.message.startsWith("DATABASE_URL not set");

const isDbUnreachable = (err: Error): boolean => err.name === "DatabaseUnreachableError";

// Extract the hostname from the message we generated server-side. The
// shape is: `Could not reach the Postgres host "foo.example". ...`.
const hostnameFromMessage = (msg: string): string | null => {
  const match = /Postgres host "([^"]+)"/.exec(msg);
  return match ? (match[1] ?? null) : null;
};

const AppError = ({ error, reset }: Props) => {
  useEffect(() => {
    console.error("[app/(app)/error]", error);
  }, [error]);

  if (isDbNotConfigured(error)) {
    return <SetupErrorScreen variant={{ kind: "db-not-configured" }} onRetry={reset} />;
  }
  if (isDbUnreachable(error)) {
    return (
      <SetupErrorScreen
        variant={{ kind: "db-unreachable", hostname: hostnameFromMessage(error.message) }}
        onRetry={reset}
      />
    );
  }
  return <GenericErrorScreen error={error} onRetry={reset} />;
};

export default AppError;

const GenericErrorScreen = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
  <main className="bg-background flex min-h-screen items-center justify-center px-6 py-16">
    <div className="border-line bg-card shadow-bezel w-full max-w-xl rounded-l border p-8">
      <div className="text-accent-rose mb-3 inline-block text-[12px] font-bold tracking-[0.22em] uppercase">
        Something went wrong
      </div>
      <h1 className="text-ink-bright text-2xl font-extrabold tracking-[-0.02em]">
        {error.name || "Error"}
      </h1>
      <p className="text-ink-muted mt-3 text-[15px] leading-relaxed break-words">
        {error.message || "Unknown error"}
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-pill border-line-strong bg-surface-2 text-ink-bright inline-flex items-center gap-2 border px-5 py-3 text-[14px] font-extrabold"
        >
          Retry
        </button>
      </div>
    </div>
  </main>
);
