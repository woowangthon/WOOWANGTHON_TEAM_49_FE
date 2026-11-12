"use client";
import { translate } from "@/i18n/translate";


import { useSearchParams } from "next/navigation";

import { PageHeading } from "@/components/ui/page-heading";
import { cardStyle } from "@/components/ui/styles";
import { parseRouteId } from "@/lib/route-id";

import { CaseForm } from "./case-form";

export function CaseCreateScreen() {
  const params = useSearchParams();
  return <div className="space-y-6"><PageHeading title={translate("cases.caseCreateScreen_new_wageCase")} description={translate("cases.caseCreateScreen_workplace_select_wage_wagePeriod_input")} /><section className={cardStyle}><CaseForm defaultWorkplaceId={parseRouteId(params.get("workplaceId"))} /></section></div>;
}
