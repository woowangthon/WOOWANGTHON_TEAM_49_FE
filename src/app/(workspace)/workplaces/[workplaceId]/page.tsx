import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkplaceDetailScreen } from "@/features/workplaces/components/workplace-detail-screen";
import { parseRouteId } from "@/lib/route-id";

export const metadata: Metadata = { title: "근무지 상세" };
export default async function WorkplacePage({ params }: { params: Promise<{ workplaceId: string }> }) {
  const id = parseRouteId((await params).workplaceId);
  if (id === null) notFound();
  return <WorkplaceDetailScreen id={id} />;
}
