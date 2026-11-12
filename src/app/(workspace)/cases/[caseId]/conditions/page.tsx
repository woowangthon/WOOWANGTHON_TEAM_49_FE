
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConditionsScreen } from "@/features/case-inputs/components/conditions-screen";
import { parseRouteId } from "@/lib/route-id";
export const metadata: Metadata = { title: translate("common.page_calculation_confirm") };
export default async function ConditionsPage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <ConditionsScreen key={id} caseId={id} />;
}
