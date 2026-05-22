import { listSelectableExpressions } from "@/lib/queries";
import { RoutedPhoneShell } from "@/components/RoutedPhoneShell";
import { AppProviders } from "./app-providers";

export const dynamic = "force-dynamic";

// Layout for the real PWA experience: a single phone with a bottom tab bar
// and routes for the three modes (Codes / Browse / Scan). The codes catalog
// is fetched once here and shared with all tabs via CodesContext so client
// navigation between tabs is instant.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const codes = await listSelectableExpressions();
  return (
    <AppProviders codes={codes}>
      <RoutedPhoneShell>{children}</RoutedPhoneShell>
    </AppProviders>
  );
}
