"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesCasesViewModels} from '@/features/cases/view-models';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { ArrowRight, Building2, Check, ChevronRight, FileArchive, FileQuestion, FileText, MapPin, MessageSquareText } from "lucide-react";
import { useStore } from "zustand";
import { useAppServices } from "@/hooks/use-app-services";
import { CaseCards } from "@/features/cases/components/case-cards";
import styles from "./consultation-screen.module.css";
import { useCase, useCases } from "@/features/cases/queries";

import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
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
  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{translate("caseSupport.consultationScreen_consultation")}</p>
        <h1>{translate("caseSupport.consultationHero_title")}<span>{translate("caseSupport.consultationHero_emphasis")}</span></h1>
        <p className={styles.heroDescription}>{translate("caseSupport.consultationScreen_consultation_wageCase_select_case_question_inquiry_draft")}</p>
        <a href="#consultation-case-selection" className={styles.heroAction}>{translate("caseSupport.consultationScreen_consultation_wageCase_select")}<ArrowRight size={18} aria-hidden="true" /></a>
        <ol className={styles.journey}><li><span>1</span>{translate("caseSupport.inquiryScreen_confirm_question")}</li><li><span>2</span>{translate("caseSupport.screens_company_inquiry_draft")}</li><li><span>3</span>{translate("caseSupport.screens_consultation_record")}</li></ol>
      </div>
      <div className={styles.heroArt} aria-hidden="true"><div className={styles.artHalo}/><div className={styles.artBack}/><div className={styles.artDocument}><FileText size={38} strokeWidth={1.7}/><span className={styles.artLine}/><span className={styles.artLineShort}/><div className={styles.artChecklist}><span><Check size={15}/><i/></span><span><Check size={15}/><i/></span><span><Check size={15}/><i/></span></div><span className={styles.artPdf}>PDF</span></div><span className={styles.artSeal}><Check size={42} strokeWidth={3}/></span><span className={styles.artMessage}><MessageSquareText size={30}/></span></div>
    </header>
    <div className={styles.supportNav}><SupportLinks caseId={choice?.caseId}/></div>

    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => void query.refetch()} /> : <>
      <section id="consultation-case-selection" tabIndex={-1} className={styles.selection} aria-label={translate("caseSupport.consultationScreen_consultation_wageCase_select")}>
        <div className={styles.sectionHeading}><div><span className={styles.step}>01</span><h2>{translate("caseSupport.consultationScreen_casePrompt")}</h2></div></div>
        {!query.data.items.length ? <div className={styles.empty}><p>{translate("caseSupport.consultationScreen_create_case_empty")}</p><Link href="/cases/new" className={styles.primaryAction}>{translate("caseSupport.consultationScreen_new_wageCase_start")}<ArrowRight size={18} aria-hidden="true" /></Link></div> : <CaseCards items={query.data.items} variant="explorer" selection={{ selectedId: selected, onSelect: caseId => consultationSelection.setState({ caseId }) }} />}
        <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={page => consultationSelection.setState({ page, caseId: undefined })} />
      </section>
      {selected && !listedChoice && (detail.isPending || detail.isError) && <QueryFeedback pending={detail.isPending} error={detail.isError ? detail.error : undefined} retry={() => void detail.refetch()} />}
      {!selected && query.data.items.length>0 && <p className={styles.selectionHint} role="status">{translate("caseSupport.chooseCase")}</p>}
      {choice && <section className={styles.preparation} aria-label={translate("caseSupport.consultationScreen_selected_case_consultation")}>
        <div className={styles.sectionHeading}><div><span className={styles.step}>02</span><h2>{translate("caseSupport.consultationScreen_prepareTitle")}</h2></div></div>
        <div className={styles.chosenCase}><span className={styles.chosenIcon}><Building2 size={22} aria-hidden="true"/></span><div><span>{translate("caseSupport.consultationScreen_selectedLabel")}</span><strong>{caseCard(choice).workplaceName}</strong></div><p>{caseCard(choice).period}</p><Check size={20} className={styles.chosenCheck} aria-hidden="true"/></div>
        <Preparation key={choice.caseId} caseId={choice.caseId}/>
      </section>}
    </>}
    <section className={styles.centerCallout} aria-labelledby="consultation-center-title">
      <span className={styles.centerIcon}><MapPin size={25} aria-hidden="true" /></span>
      <div><p className={styles.calloutEyebrow}>{translate("caseSupport.inquiryScreen_consultationCenter")}</p><h2 id="consultation-center-title">{translate("caseSupport.centersScreen_consultationCenter")}</h2><p>{translate("caseSupport.centersScreen_consultation_count_information_confirm")}</p></div>
      <Link href="/consultation-centers" className={styles.centerLink}>{translate("caseSupport.centersScreen_consultationCenter")}<ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
  </div>;
}

function Preparation({caseId}:{caseId:number}) {
 const s=useSessionScope();const {translate}=useTranslation();const removal=useCaseRemoval(caseId);
 const enabled=s.enabled&&!removal.pending&&!removal.removed;
 const questions=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),"questions"],enabled,queryFn:({signal})=>supportApi(s.api).questions(caseId,signal),staleTime:0});
 const reports=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),"reports","list",1],enabled,queryFn:({signal})=>supportApi(s.api).reports(caseId,signal),staleTime:0,refetchInterval:q=>q.state.error?false:q.state.data?.items.some(r=>r.status==="PROCESSING")?2000:false});
 return <div className={styles.preparationBody}>
  <p className={styles.flow}>{translate("caseSupport.supportFlow")}</p>
  <div className={styles.actionGrid}>
   <article className={styles.actionCard}>
    <div className={styles.actionTop}><span className={styles.actionIcon}><FileQuestion size={27} aria-hidden="true" /></span><span className={styles.actionNumber}>01</span></div>
    <h3>{translate("caseSupport.inquiryScreen_confirm_question")}</h3>
    <p>{translate("caseSupport.questionsPurpose")}</p>
    {questions.isPending?<QueryFeedback pending/>:questions.isError?<QueryFeedback error={questions.error} retry={()=>void questions.refetch()}/>:<strong className={styles.actionStatus} role="status">{translate("caseSupport.questionCount",{count:questions.data.questions.length})}</strong>}
    <Link href={`/cases/${caseId}/questions`} className={styles.cardLink}>{translate("caseSupport.inquiryScreen_confirm_question")}<ChevronRight size={19} aria-hidden="true" /></Link>
   </article>
   <article className={styles.actionCard}>
    <div className={styles.actionTop}><span className={`${styles.actionIcon} ${styles.messageIcon}`}><MessageSquareText size={27} aria-hidden="true" /></span><span className={styles.actionNumber}>02</span></div>
    <h3>{translate("caseSupport.screens_company_inquiry_draft")}</h3>
    <p>{translate("caseSupport.inquiryPurpose")}</p>
    <Link href={`/cases/${caseId}/company-inquiry`} className={styles.cardLink}>{translate("caseSupport.screens_company_inquiry_draft")}<ChevronRight size={19} aria-hidden="true" /></Link>
   </article>
   <article className={styles.reportCard}>
    <div className={styles.reportCopy}>
    <span className={styles.reportEyebrow}>{translate("caseSupport.screens_consultation_record")}</span>
    <h3>{translate("caseSupport.consultationScreen_outputTitle")}</h3>
    <p>{translate("caseSupport.reportsPurpose")}</p>
    {reports.isPending?<QueryFeedback pending/>:reports.isError?<QueryFeedback error={reports.error} retry={()=>void reports.refetch()}/>:<strong className={styles.actionStatus} role="status">{reports.data.items.length?translate("caseSupport.reportSummary",{count:reports.data.items.length}):translate("caseSupport.screens_report_history_empty")}</strong>}
    <Link href={`/cases/${caseId}/reports`} className={styles.reportLink}>{translate("caseSupport.screens_consultation_record")}<ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
    <div className={styles.outputGuide}>
     <div><span className={styles.pdfIcon}><FileText size={28} aria-hidden="true" /></span><span><strong>{translate("caseSupport.reportPresentation_consultation_report")}</strong><small>{translate("caseSupport.reportPresentation_pdf_download")}</small></span><span className={styles.fileType}>PDF</span></div>
     <div><span className={styles.zipIcon}><FileArchive size={28} aria-hidden="true" /></span><span><strong>{translate("caseSupport.reportPresentation_select_original")}</strong><small>{translate("caseSupport.reportPresentation_original_download")}</small></span><span className={styles.fileType}>ZIP</span></div>
    </div>
    <p className={styles.reportNote}>{translate("caseSupport.screens_current_result_required_original_report_consultationCenter_automatic")}</p>
   </article>
  </div>
 </div>;
}
