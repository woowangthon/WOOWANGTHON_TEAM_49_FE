import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseDetailScreen } from "@/features/cases/components/case-detail-screen";
import { parseRouteId } from "@/lib/route-id";

export const metadata: Metadata = { title: "자료 등록 단계 안내" };
export default async function UploadStagePage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <CaseDetailScreen id={id} uploadStage />;
}
