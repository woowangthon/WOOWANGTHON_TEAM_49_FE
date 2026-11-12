"use client";
import { translate } from "@/i18n/translate";


import Link from "next/link";
import { useState } from "react";
import { useCases } from "@/features/cases/queries";
import { caseCard } from "@/features/cases/view-models";
import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { SupportLinks } from "./screens";

export function ConsultationScreen() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number>();
  const query = useCases(page);
  const choice = query.data?.items.find(item => item.caseId === selected);
  return <div className="space-y-6">
    <PageHeading title={translate("caseSupport.consultationScreen_consultation")} description={translate("caseSupport.consultationScreen_consultation_wageCase_select_case_question_inquiry_draft")} />
    <Link className={secondaryButton} href="/consultation-centers">{translate("caseSupport.centersScreen_consultationCenter")}</Link>
    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => void query.refetch()} /> : <>
      <fieldset className={`${cardStyle} space-y-3`}><legend>{translate("caseSupport.consultationScreen_consultation_wageCase_select")}</legend>
        {!query.data.items.length && <p>{translate("caseSupport.consultationScreen_create_case_empty")}<Link href="/cases/new" className="underline">{translate("caseSupport.consultationScreen_new_wageCase_start")}</Link></p>}
        {query.data.items.map(dto => { const item = caseCard(dto); return <label key={dto.caseId} className="flex min-h-11 items-center gap-3 border-b border-border py-3"><input type="radio" name="consultation-case" checked={selected === dto.caseId} onChange={() => setSelected(dto.caseId)} /><span>{translate("caseSupport.consultationScreen_case", { value1: item.workplaceName, value2: item.period, value3: item.payType, value4: dto.caseId })}</span></label>; })}
        <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={next => { setPage(next); setSelected(undefined); }} />
      </fieldset>
      {choice && <section className={`${cardStyle} space-y-4`} aria-label={translate("caseSupport.consultationScreen_selected_case_consultation")}><h2 className="font-bold">{caseCard(choice).workplaceName} · {caseCard(choice).period}</h2><SupportLinks caseId={choice.caseId} /></section>}
    </>}
  </div>;
}
