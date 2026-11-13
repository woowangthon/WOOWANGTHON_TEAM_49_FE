"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesCasesViewModels} from '@/features/cases/view-models';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { useState } from "react";
import { useCases } from "@/features/cases/queries";

import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle } from "@/components/ui/styles";
import { SupportLinks } from "./support-navigation";
import { useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useSessionGeneration } from "@/hooks/use-app-services";
import { businessKeys } from "@/lib/query/business-keys";
import { supportApi } from "./api";
import { useCaseRemoval } from "@/features/cases/queries";

export function ConsultationScreen() {
 const generation=useSessionGeneration();
 return <ConsultationContent key={generation}/>;
}
function ConsultationContent() {
const {caseCard} = useLocalized(createLocalizedFeaturesCasesViewModels);

 const {translate} = useTranslation();

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number>();
  const query = useCases(page);
  const choice = query.data?.items.find(item => item.caseId === selected);
  return <div className="w-full min-w-0 max-w-6xl space-y-6 [overflow-wrap:anywhere]">
    <PageHeading title={translate("caseSupport.consultationScreen_consultation")} description={translate("caseSupport.consultationScreen_consultation_wageCase_select_case_question_inquiry_draft")} />
    {!choice && <SupportLinks/>}
    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => void query.refetch()} /> : <>
      <fieldset className={`${cardStyle} space-y-3`}><legend>{translate("caseSupport.consultationScreen_consultation_wageCase_select")}</legend>
        {!query.data.items.length && <p>{translate("caseSupport.consultationScreen_create_case_empty")}<Link href="/cases/new" className="underline">{translate("caseSupport.consultationScreen_new_wageCase_start")}</Link></p>}
        {query.data.items.map(dto => { const item = caseCard(dto); return <label key={dto.caseId} className="flex min-h-11 items-center gap-3 border-b border-border py-3"><input type="radio" name="consultation-case" checked={selected === dto.caseId} onChange={() => setSelected(dto.caseId)} /><span>{translate("caseSupport.consultationScreen_case", { value1: item.workplaceName, value2: item.period, value3: item.payType, value4: dto.caseId })}</span></label>; })}
        <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={next => { setPage(next); setSelected(undefined); }} />
      </fieldset>
      {!choice && query.data.items.length>0 && <p role="status">{translate("caseSupport.chooseCase")}</p>}
      {choice && <section className={`${cardStyle} space-y-4`} aria-label={translate("caseSupport.consultationScreen_selected_case_consultation")}><h2 className="font-bold">{caseCard(choice).workplaceName} · {caseCard(choice).period}</h2><Preparation key={choice.caseId} caseId={choice.caseId}/></section>}
    </>}
  </div>;
}

function Preparation({caseId}:{caseId:number}) {
 const s=useSessionScope();const {translate}=useTranslation();const removal=useCaseRemoval(caseId);
 const enabled=s.enabled&&!removal.pending&&!removal.removed;
 const questions=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),"questions"],enabled,queryFn:({signal})=>supportApi(s.api).questions(caseId,signal),staleTime:0});
 const reports=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),"reports","list",1],enabled,queryFn:({signal})=>supportApi(s.api).reports(caseId,signal),staleTime:0,refetchInterval:q=>q.state.error?false:q.state.data?.items.some(r=>r.status==="PROCESSING")?2000:false});
 return <div className="space-y-4"><p>{translate("caseSupport.supportFlow")}</p><SupportLinks caseId={caseId}/>
 <div className="grid min-w-0 gap-4 md:grid-cols-3">
 <section className={cardStyle}><h3 className="font-bold">{translate("caseSupport.inquiryScreen_confirm_question")}</h3><p>{translate("caseSupport.questionsPurpose")}</p>{questions.isPending?<QueryFeedback pending/>:questions.isError?<QueryFeedback error={questions.error} retry={()=>void questions.refetch()}/>:<p role="status">{translate("caseSupport.questionCount",{count:questions.data.questions.length})}</p>}</section>
 <section className={cardStyle}><h3 className="font-bold">{translate("caseSupport.screens_company_inquiry_draft")}</h3><p>{translate("caseSupport.inquiryPurpose")}</p></section>
 <section className={cardStyle}><h3 className="font-bold">{translate("caseSupport.screens_consultation_record")}</h3><p>{translate("caseSupport.reportsPurpose")}</p>{reports.isPending?<QueryFeedback pending/>:reports.isError?<QueryFeedback error={reports.error} retry={()=>void reports.refetch()}/>:<p role="status">{reports.data.items.length?translate("caseSupport.reportSummary",{count:reports.data.items.length}):translate("caseSupport.screens_report_history_empty")}</p>}</section>
 </div></div>;
}
