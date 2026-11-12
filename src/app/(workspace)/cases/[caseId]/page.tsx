
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseDetailScreen } from "@/features/cases/components/case-detail-screen";
import { parseRouteId } from "@/lib/route-id";

export const metadata: Metadata = { title: translate("common.page_wageCase_detail") };
export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <CaseDetailScreen id={id} />;
}
