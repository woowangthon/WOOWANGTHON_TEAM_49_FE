
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";
import { CaseList } from "@/features/cases/components/case-list";

export const metadata: Metadata = { title: translate("common.page_wage_confirm_case") };

export default function CasesPage() {
  return <CaseList />;
}
