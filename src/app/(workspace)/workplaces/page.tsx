
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";

import { WorkplaceListScreen } from "@/features/workplaces/components/workplace-list-screen";

export const metadata: Metadata = { title: translate("common.page_workplace") };
export default function WorkplacesPage() { return <WorkplaceListScreen />; }
