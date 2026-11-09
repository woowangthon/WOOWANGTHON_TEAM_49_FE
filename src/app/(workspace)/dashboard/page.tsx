import type { Metadata } from "next";

import { DashboardScreen } from "@/features/dashboard/dashboard-screen";

export const metadata: Metadata = { title: "대시보드" };

export default function DashboardPage() {
  return <DashboardScreen />;
}
