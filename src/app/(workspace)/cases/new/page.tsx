import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";

import { CaseCreateScreen } from "@/features/cases/components/case-create-screen";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_new_wageCase") };
}
export default function NewCasePage() { return <CaseCreateScreen />; }
