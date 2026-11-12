
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseUploadScreen } from "@/features/documents/components/document-screens";
import { parseRouteId } from "@/lib/route-id";

export const metadata: Metadata = { title: translate("common.page_case_record_create") };
export default async function UploadStagePage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <CaseUploadScreen id={id} />;
}
