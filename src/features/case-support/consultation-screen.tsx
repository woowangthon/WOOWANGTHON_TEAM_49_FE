"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesCasesViewModels} from '@/features/cases/view-models';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { useStore } from "zustand";
import { useAppServices } from "@/hooks/use-app-services";
import { CaseCards } from "@/features/cases/components/case-cards";
import styles from "@/features/cases/components/case-explorer.module.css";
import { useCase, useCases } from "@/features/cases/queries";

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

  const { consultationSelection } = useAppServices();
  const { page, caseId: selected } = useStore(consultationSelection);
  const query = useCases(page);
  const listedChoice = query.data?.items.find(item => item.caseId === selected);
  const detail = useCase(selected && !listedChoice ? selected : 0);
  const choice = listedChoice ?? detail.data;
  return <div className={`${styles.explorer} w-full space-y-6 [overflow-wrap:anywhere]`}>
    <header className={styles.header}><div className={styles.heroCopy}><p className={styles.eyebrow}><span aria-hidden="true" />{translate("cases.caseList_wage")}</p><h1>{translate("caseSupport.consultationScreen_consultation")}</h1><p className={styles.intro}>{translate("caseSupport.consultationScreen_consultation_wageCase_select_case_question_inquiry_draft")}</p></div></header>
    <SupportLinks caseId={choice?.caseId}/>

    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => void query.refetch()} /> : <>
      <section id="consultation-case-selection" tabIndex={-1} className={styles.panel} aria-label={translate("caseSupport.consultationScreen_consultation_wageCase_select")}>
        <div className={styles.listHeading}><h2>{translate("caseSupport.consultationScreen_consultation_wageCase_select")}</h2><p>{translate("caseSupport.chooseCase")}</p></div>
        {!query.data.items.length ? <div className={styles.empty}><p>{translate("caseSupport.consultationScreen_create_case_empty")}</p><Link href="/cases/new" className={styles.create}>{translate("caseSupport.consultationScreen_new_wageCase_start")}</Link></div> : <CaseCards items={query.data.items} variant="explorer" selection={{ selectedId: selected, onSelect: caseId => consultationSelection.setState({ caseId }) }} />}
        <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={page => consultationSelection.setState({ page, caseId: undefined })} />
      </section>
      {selected && !listedChoice && (detail.isPending || detail.isError) && <QueryFeedback pending={detail.isPending} error={detail.isError ? detail.error : undefined} retry={() => void detail.refetch()} />}
      {!selected && query.data.items.length>0 && <p role="status">{translate("caseSupport.chooseCase")}</p>}
      {choice && <section className={`${cardStyle} space-y-4`} aria-label={translate("caseSupport.consultationScreen_selected_case_consultation")}><h2 className="font-bold">{caseCard(choice).workplaceName} · {caseCard(choice).period}</h2><Preparation key={choice.caseId} caseId={choice.caseId}/></section>}
    </>}
  </div>;
}

function Preparation({caseId}:{caseId:number}) {
 const s=useSessionScope();const {translate}=useTranslation();const removal=useCaseRemoval(caseId);
 const enabled=s.enabled&&!removal.pending&&!removal.removed;
 const questions=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),"questions"],enabled,queryFn:({signal})=>supportApi(s.api).questions(caseId,signal),staleTime:0});
 const reports=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),"reports","list",1],enabled,queryFn:({signal})=>supportApi(s.api).reports(caseId,signal),staleTime:0,refetchInterval:q=>q.state.error?false:q.state.data?.items.some(r=>r.status==="PROCESSING")?2000:false});
 return <div className="space-y-4"><p>{translate("caseSupport.supportFlow")}</p>
 <div className="grid min-w-0 gap-4 md:grid-cols-3">
 <section className={cardStyle}><h3 className="font-bold">{translate("caseSupport.inquiryScreen_confirm_question")}</h3><p>{translate("caseSupport.questionsPurpose")}</p>{questions.isPending?<QueryFeedback pending/>:questions.isError?<QueryFeedback error={questions.error} retry={()=>void questions.refetch()}/>:<p role="status">{translate("caseSupport.questionCount",{count:questions.data.questions.length})}</p>}</section>
 <section className={cardStyle}><h3 className="font-bold">{translate("caseSupport.screens_company_inquiry_draft")}</h3><p>{translate("caseSupport.inquiryPurpose")}</p></section>
 <section className={cardStyle}><h3 className="font-bold">{translate("caseSupport.screens_consultation_record")}</h3><p>{translate("caseSupport.reportsPurpose")}</p>{reports.isPending?<QueryFeedback pending/>:reports.isError?<QueryFeedback error={reports.error} retry={()=>void reports.refetch()}/>:<p role="status">{reports.data.items.length?translate("caseSupport.reportSummary",{count:reports.data.items.length}):translate("caseSupport.screens_report_history_empty")}</p>}</section>
 </div></div>;
}
