import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManualScreen } from "@/features/case-inputs/components/manual-screen";
import { parseRouteId } from "@/lib/route-id";
export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_manual_record_input") };
}
export default async function ManualRecordsPage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <ManualScreen key={id} caseId={id} />;
}
