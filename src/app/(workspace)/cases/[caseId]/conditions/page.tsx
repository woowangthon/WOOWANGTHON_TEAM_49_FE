import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConditionsScreen } from "@/features/case-inputs/components/conditions-screen";
import { parseRouteId } from "@/lib/route-id";
export const metadata: Metadata = { title: "계산 조건 확인" };
export default async function ConditionsPage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <ConditionsScreen key={id} caseId={id} />;
}
