import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";

import { DashboardScreen } from "@/features/dashboard/dashboard-screen";

export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return { title: t("common.page_dashboard") };
}

export default function DashboardPage() {
  return <DashboardScreen />;
}
