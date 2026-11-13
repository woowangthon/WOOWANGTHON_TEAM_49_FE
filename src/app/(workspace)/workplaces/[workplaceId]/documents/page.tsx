import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkplaceDocumentsScreen } from "@/features/documents/components/document-screens";
import { parseRouteId } from "@/lib/route-id";
export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_workplace_library") };
}
export default async function WorkplaceDocumentsPage({ params }: { params: Promise<{ workplaceId: string }> }) {
  const id = parseRouteId((await params).workplaceId);
  if (id === null) notFound();
  return <WorkplaceDocumentsScreen id={id} />;
}
