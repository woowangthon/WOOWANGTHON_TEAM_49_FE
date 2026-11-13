import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseDetailScreen } from "@/features/cases/components/case-detail-screen";
import { parseRouteId } from "@/lib/route-id";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_wageCase_detail") };
}
export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const id = parseRouteId((await params).caseId);
  if (id === null) notFound();
  return <CaseDetailScreen id={id} />;
}
