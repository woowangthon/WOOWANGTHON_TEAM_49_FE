import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";

import { WorkplaceListScreen } from "@/features/workplaces/components/workplace-list-screen";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_workplace") };
}
export default function WorkplacesPage() { return <WorkplaceListScreen />; }
