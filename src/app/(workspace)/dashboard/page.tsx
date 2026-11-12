
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";

import { DashboardScreen } from "@/features/dashboard/dashboard-screen";

export const metadata: Metadata = { title: translate("common.page_dashboard") };

export default function DashboardPage() {
  return <DashboardScreen />;
}
