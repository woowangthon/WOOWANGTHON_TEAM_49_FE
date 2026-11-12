import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseUploadScreen } from "@/features/documents/components/document-screens";
import { parseRouteId } from "@/lib/route-id";

export const metadata: Metadata = { title: "내역 자료 등록" };
export default async function UploadStagePage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <CaseUploadScreen id={id} />;
}
