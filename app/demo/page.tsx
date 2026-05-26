import { SetupErrorScreen } from "@/components/SetupErrorScreen";
import { DatabaseNotConfiguredError, DatabaseUnreachableError } from "@/lib/db";
import { listSelectableExpressions } from "@/lib/queries";

import { ClientStage } from "./client-stage";

export const dynamic = "force-dynamic";

// Demo surface: three phones side by side on a dark stage. The real PWA
// lives at "/". See app/(app)/layout.tsx for the routed single-phone shell.
//
// Mirrors the (app) layout's DB error handling so a missing/unreachable
// DATABASE_URL renders the friendly SetupErrorScreen here too, instead of
// a Next.js 500.
const DemoPage = async () => {
  try {
    const codes = await listSelectableExpressions();
    return <ClientStage allCodes={codes} />;
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return <SetupErrorScreen variant={{ kind: "db-not-configured" }} />;
    }
    if (err instanceof DatabaseUnreachableError) {
      return <SetupErrorScreen variant={{ kind: "db-unreachable", hostname: err.hostname }} />;
    }
    throw err;
  }
};

export default DemoPage;
