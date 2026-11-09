import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { AuthPending } from "@/features/auth/components/auth-pending";
import { WorkspaceNavigation } from "@/features/auth/components/workspace-navigation";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthPending fullPage />}>
      <AuthGate mode="protected">
        <AppShell navigation={<WorkspaceNavigation />}>{children}</AppShell>
      </AuthGate>
    </Suspense>
  );
}
