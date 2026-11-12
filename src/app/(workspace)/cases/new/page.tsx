
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";

import { CaseCreateScreen } from "@/features/cases/components/case-create-screen";

export const metadata: Metadata = { title: translate("common.page_new_wageCase") };
export default function NewCasePage() { return <CaseCreateScreen />; }
