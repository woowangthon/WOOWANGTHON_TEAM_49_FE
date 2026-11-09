import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkplaceDocumentsScreen } from "@/features/documents/components/document-screens";
import { parseRouteId } from "@/lib/route-id";
export const metadata: Metadata = { title: "근무지 자료함" };
export default async function WorkplaceDocumentsPage({ params }: { params: Promise<{ workplaceId: string }> }) {
  const id = parseRouteId((await params).workplaceId);
  if (id === null) notFound();
  return <WorkplaceDocumentsScreen id={id} />;
}
