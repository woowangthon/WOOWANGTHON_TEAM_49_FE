import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManualScreen } from "@/features/case-inputs/components/manual-screen";
import { parseRouteId } from "@/lib/route-id";
export const metadata: Metadata = { title: "수기 자료 입력·관리" };
export default async function ManualRecordsPage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <ManualScreen key={id} caseId={id} />;
}
