import type { ReactNode } from "react";
import { CaseContext } from "@/features/cases/components/case-context";
import { parseRouteId } from "@/lib/route-id";
export default async function CaseLayout({ children, params }: { children: ReactNode; params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  return <>{id !== null && <CaseContext id={id} />}{children}</>;
}
