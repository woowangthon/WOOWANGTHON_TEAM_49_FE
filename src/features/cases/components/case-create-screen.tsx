"use client";

import { useSearchParams } from "next/navigation";

import { PageHeading } from "@/components/ui/page-heading";
import { cardStyle } from "@/components/ui/styles";
import { parseRouteId } from "@/lib/route-id";

import { CaseForm } from "./case-form";

export function CaseCreateScreen() {
  const params = useSearchParams();
  return <div className="space-y-6"><PageHeading title="새 급여 내역" description="근무지를 선택하고 실제 급여 산정기간을 입력해 주세요." /><section className={cardStyle}><CaseForm defaultWorkplaceId={parseRouteId(params.get("workplaceId"))} /></section></div>;
}
