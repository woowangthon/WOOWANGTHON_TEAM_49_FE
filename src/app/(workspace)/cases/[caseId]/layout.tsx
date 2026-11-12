import type { ReactNode } from "react";
import { CaseWorkspace } from "@/features/cases/components/case-workspace";
import { parseRouteId } from "@/lib/route-id";
export default async function CaseLayout({ children, params }: { children: ReactNode; params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  return id === null ? children : <CaseWorkspace id={id}>{children}</CaseWorkspace>;
}
