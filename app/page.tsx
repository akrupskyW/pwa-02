import { listSelectableExpressions } from "@/lib/queries";
import { ClientStage } from "./client-stage";

export const dynamic = "force-dynamic";

// Server Component — fetches the codes catalog from Postgres once per request
// and hands it down to the client stage. The codes catalog is small and stable;
// SSRing it means the picker is interactive on first paint.
export default async function Home() {
  const codes = await listSelectableExpressions();
  return <ClientStage allCodes={codes} />;
}
