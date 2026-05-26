import { RoutedPhoneShell } from "@/components/RoutedPhoneShell";
import { SetupErrorScreen } from "@/components/SetupErrorScreen";
import { DatabaseNotConfiguredError, DatabaseUnreachableError } from "@/lib/db";
import { listSelectableExpressions } from "@/lib/queries";

import { AppProviders } from "./app-providers";

export const dynamic = "force-dynamic";

// Layout for the real PWA experience: a single phone with a bottom tab bar
// and routes for the three modes (Codes / Browse / Scan). The codes catalog
// is fetched once here and shared with all tabs via the codes slice so client
// navigation between tabs is instant.
//
// Note: errors thrown inside a layout do NOT get caught by the layout's
// sibling error.tsx (the boundary lives inside the layout's tree). So we
// catch the missing-env case explicitly here and render the friendly setup
// screen instead. Any other error re-throws and bubbles to error.tsx.
const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  try {
    const codes = await listSelectableExpressions();
    return (
      <AppProviders codes={codes}>
        <RoutedPhoneShell>{children}</RoutedPhoneShell>
      </AppProviders>
    );
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

export default AppLayout;
