import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

// Layout only: business pages and authentication guards belong to later features.
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
