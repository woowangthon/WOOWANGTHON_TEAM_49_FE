import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";
import { CaseList } from "@/features/cases/components/case-list";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_wage_confirm_case") };
}

export default function CasesPage() {
  return <CaseList />;
}
