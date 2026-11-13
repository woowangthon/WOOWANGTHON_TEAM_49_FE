import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkplaceDetailScreen } from "@/features/workplaces/components/workplace-detail-screen";
import { parseRouteId } from "@/lib/route-id";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_workplace_detail") };
}
export default async function WorkplacePage({ params }: { params: Promise<{ workplaceId: string }> }) {
  const id = parseRouteId((await params).workplaceId);
  if (id === null) notFound();
  return <WorkplaceDetailScreen id={id} />;
}
