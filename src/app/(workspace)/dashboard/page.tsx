import type { Metadata } from "next";

import { AccountOverview } from "@/features/auth/components/account-overview";

export const metadata: Metadata = { title: "내 계정" };

export default function DashboardPage() {
  return <AccountOverview />;
}
