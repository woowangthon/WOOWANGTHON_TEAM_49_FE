import type { Metadata } from "next";

import { WorkplaceListScreen } from "@/features/workplaces/components/workplace-list-screen";

export const metadata: Metadata = { title: "내 근무지" };
export default function WorkplacesPage() { return <WorkplaceListScreen />; }
