
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManualScreen } from "@/features/case-inputs/components/manual-screen";
import { parseRouteId } from "@/lib/route-id";
export const metadata: Metadata = { title: translate("common.page_manual_record_input") };
export default async function ManualRecordsPage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <ManualScreen key={id} caseId={id} />;
}
