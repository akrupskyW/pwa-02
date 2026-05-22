import { listSelectableExpressions } from "@/lib/queries";
import { ClientStage } from "./client-stage";

export const dynamic = "force-dynamic";

// Demo surface: three phones side by side on a dark stage. The real PWA
// lives at "/". See app/(app)/layout.tsx for the routed single-phone shell.
export default async function DemoPage() {
  const codes = await listSelectableExpressions();
  return <ClientStage allCodes={codes} />;
}
