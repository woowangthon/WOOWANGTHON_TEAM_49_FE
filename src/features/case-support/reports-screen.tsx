"use client";

import Link from 'next/link';
import { FileArchive, FileCheck2, FileText, Plus, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { useLocalized, useTranslation } from '@/i18n/use-translation';
import { useSessionGeneration } from '@/hooks/use-app-services';
import { useCase, useCaseRemoval } from '@/features/cases/queries';
import { CaseStageHeader } from '@/features/cases/components/case-stage-header';
import { useRecomputeStatus } from '@/features/documents/queries';
import { createLocalizedFeaturesDocumentsViewModels } from '@/features/documents/view-models';
import { useResults } from '@/features/results/queries';
import { QueryFeedback } from '@/components/ui/query-feedback';
import { secondaryButton } from '@/components/ui/styles';
import { SupportLinks } from './support-navigation';
import { useCreateReport, useReportDocuments, useReports } from './queries';
import { ReportCard } from './report-card';
import type { Report } from './schemas';
import styles from './reports-screen.module.css';

export function ReportsScreen({caseId}:{caseId:number}) {
  const generation=useSessionGeneration();
  return <ReportsContent key={`${generation}:${caseId}`} caseId={caseId}/>;
}

function ReportsContent({caseId}:{caseId:number}) {
  const {translate}=useTranslation();
  const removed=useCaseRemoval(caseId), detail=useCase(caseId);
  const [ids,setIds]=useState<number[]>([]),[ack,setAck]=useState(false);
  const [tracking,setTracking]=useState<Report|null>(null),[selectedReport,setSelectedReport]=useState<Report|null>(null);
  const lock=useRef(false);
  useRecomputeStatus(caseId);
  const results=useResults(caseId,true), docs=useReportDocuments(caseId);
  // Keep recent files available while browsing older history.
  const latest=useReports(caseId);
  const recent=latest.data?.items.find(r=>r.status==='READY');
  const tracked=latest.data?.items.find(r=>r.reportId===tracking?.reportId)??tracking;
  const active=selectedReport??tracked??recent;
  const previous=tracked?.status==='PROCESSING'&&recent?.reportId!==tracked.reportId?recent:undefined;
  const freshness=results.data?.freshness.overall;
  const basis=freshness==='CURRENT'?'caseSupport.bundle_current':freshness==='STALE'?'caseSupport.bundle_stale':freshness==='UPDATING'?'caseSupport.bundle_updating':'caseSupport.bundle_unknown';
  const create=useCreateReport(caseId,docs.data?.items.map(document=>document.documentId)??[],report=>{
    setTracking(report);setSelectedReport(null);setAck(false);
  });
  async function generate() {
    if(lock.current)return;
    lock.current=true;
    try {await create.mutateAsync([...ids])}
    catch { /* The mutation error is displayed below the form. */ }
    finally {lock.current=false}
  }
  const select=(next:number[])=>{setIds(next);setAck(false)};
  const workplace=typeof detail.data?.workplace.name==='string'?detail.data.workplace.name:translate('common.notProvided');
  return <div className={styles.page}>
    <CaseStageHeader stage="reports" title={translate('caseSupport.bundle_title')} description={translate('caseSupport.bundle_description')}/>
    <SupportLinks caseId={caseId}/>
    <section className={styles.context} aria-label={translate('caseSupport.bundle_context')}>
      <span className={styles.contextIcon}><FileText size={24} aria-hidden="true"/></span><div><strong>{workplace}</strong><p>{detail.data?`${detail.data.periodStart} – ${detail.data.periodEnd}`:translate('common.notProvided')}</p></div>
      <span className={styles.basis} data-current={freshness==='CURRENT'}>{translate(basis)}</span>
    </section>
    {detail.isError&&<QueryFeedback error={detail.error} retry={()=>void detail.refetch()}/>}
    {latest.isPending&&!active&&<QueryFeedback pending/>}
    {latest.isError&&<QueryFeedback error={latest.error} retry={()=>void latest.refetch()}/>}
    {active&&<section aria-label={translate(selectedReport?'caseSupport.screens_select_report':tracking?'caseSupport.screens_current_request':'caseSupport.bundle_latest')}><h2 className={styles.sectionTitle}>{translate(selectedReport?'caseSupport.screens_select_report':tracking?'caseSupport.screens_current_request':'caseSupport.bundle_latest')}</h2><ReportCard key={active.reportId} caseId={caseId} initial={active}/></section>}
    {previous&&active?.reportId!==previous.reportId&&<section aria-label={translate('caseSupport.bundle_previous')}><h2 className={styles.sectionTitle}>{translate('caseSupport.bundle_previous')}</h2><ReportCard key={previous.reportId} caseId={caseId} initial={previous}/></section>}
    <section aria-labelledby="bundle-create-title" className={styles.newBundle}>
      <div className={styles.sectionHeading}><span className={styles.step}>1</span><div><h2 id="bundle-create-title">{translate('caseSupport.bundle_prepare')}</h2><p>{translate('caseSupport.bundle_optional')}</p></div></div>
      <div className={styles.builder}>
        <ReportDocuments caseId={caseId} query={docs} ids={ids} pending={create.isPending} onSelect={select}/>
        <aside className={styles.summary} aria-labelledby="bundle-summary-title">
          <div className={styles.sectionHeading}><span className={styles.step}>2</span><h2 id="bundle-summary-title">{translate('caseSupport.bundle_summary')}</h2></div>
          <div className={styles.summaryFile}><span><FileCheck2 size={25} aria-hidden="true"/></span><div><strong>{translate('caseSupport.reportPresentation_consultation_report')}</strong><p>{translate('caseSupport.bundle_pdfHint')}</p></div><b>PDF</b></div>
          <div className={styles.summaryFile}><span><FileArchive size={25} aria-hidden="true"/></span><div><strong>{translate('caseSupport.bundle_originalCount',{count:ids.length})}</strong><p>{translate(ids.length?'caseSupport.bundle_zipHint':'caseSupport.bundle_noOriginals')}</p></div>{ids.length>0&&<b>ZIP</b>}</div>
          <p className={styles.separateNote}>{translate('caseSupport.bundle_separateFiles')}</p>
          <details className={styles.resultDetails}><summary>{translate('caseSupport.screens_result_basis_detail')}</summary><p>{translate('caseSupport.screens_current_input_version_result',{value1:results.data?.currentInputVersion??translate('common.notProvided'),value2:results.data?.resultVersion??translate('caseSupport.reportPresentation_none')})}</p><p>{translate('caseSupport.screens_answer_calculation_current_result_report_request')}</p></details>
          {results.isError&&<QueryFeedback error={results.error} retry={()=>void results.refetch()}/>}
          {freshness&&freshness!=='CURRENT'&&<p className={styles.warning}>{translate('caseSupport.bundle_refreshHelp')} <Link href={`/cases/${caseId}/result`}>{translate('caseSupport.bundle_viewResults')}</Link></p>}
          <p className={styles.help}><ShieldCheck size={17} aria-hidden="true"/>{translate('caseSupport.reportConfirmation')}</p>
          <label className={styles.ack}><input type="checkbox" checked={ack} disabled={create.isPending} onChange={e=>setAck(e.target.checked)}/><span>{translate('caseSupport.screens_select_document_current_result_report_request')}</span></label>
          <button className={styles.createButton} disabled={!ack||create.isPending||results.isPending||results.isError||docs.isPending||docs.isError||removed.pending||removed.removed} onClick={()=>void generate()}>{translate(create.isPending?'caseSupport.bundle_creating':'caseSupport.screens_report_request')}</button>
        </aside>
      </div>
    </section>
    {create.isSuccess&&<p role="status" className={styles.notice}>{translate('caseSupport.screens_count_pdf_complete_status_confirm')}</p>}
    {create.isError&&<div className={styles.warning}><QueryFeedback error={create.error}/><p>{translate('caseSupport.screens_current_update_request_document_link_permission_confirm')}</p></div>}
    <ReportHistory caseId={caseId} onSelect={setSelectedReport}/>
  </div>;
}

function ReportDocuments({caseId,query,ids,pending,onSelect}:{
  caseId:number;
  query:ReturnType<typeof useReportDocuments>;
  ids:number[];
  pending:boolean;
  onSelect:(ids:number[])=>void;
}) {
  const {translate}=useTranslation();
  const {documentCard}=useLocalized(createLocalizedFeaturesDocumentsViewModels);
  const [documentPage,setDocumentPage]=useState(1);
  const documentPages=Math.max(1,Math.ceil((query.data?.items.length??0)/5));
  const visiblePage=Math.min(documentPage,documentPages);
  return (
        <fieldset className={styles.documents}>
          <legend>{translate('caseSupport.screens_included_link_original_select')}</legend><p className={styles.help}>{translate('caseSupport.selectionLimit')}</p>
          <div className={styles.selectionActions}><button type="button" disabled={!query.data?.items.length||pending} onClick={()=>onSelect(query.data?.items.slice(0,100).map(d=>d.documentId)??[])}>{translate('caseSupport.selectAll')}</button><button type="button" disabled={!ids.length||pending} onClick={()=>onSelect([])}>{translate('caseSupport.clearSelection')}</button></div>
          {query.isPending?<QueryFeedback pending/>:query.isError?<QueryFeedback error={query.error} retry={()=>void query.refetch()}/>:!query.data.items.length?<div className={styles.empty}><FileText size={32} aria-hidden="true"/><p>{translate('caseSupport.noDocuments')}</p><Link href={`/cases/${caseId}/upload`}>{translate('caseSupport.screens_document_review')}</Link></div>:<div className={styles.documentList}>{query.data.items.slice((visiblePage-1)*5,visiblePage*5).map(d=>{
            const card=documentCard(d);
            return <label key={d.documentId} className={styles.document} data-selected={ids.includes(d.documentId)}><input type="checkbox" aria-label={d.fileName} disabled={pending||(!ids.includes(d.documentId)&&ids.length>=100)} checked={ids.includes(d.documentId)} onChange={e=>onSelect(e.target.checked?[...ids,d.documentId]:ids.filter(id=>id!==d.documentId))}/><span className={styles.fileIcon}><FileText size={21} aria-hidden="true"/></span><span className={styles.fileInfo}><strong>{d.fileName}</strong><span>{card.typeLabel} · {card.reviewLabel}</span></span></label>;
          })}</div>}
          {documentPages>1&&<nav aria-label={translate('caseSupport.screens_original_select_page')} className={styles.pagination}><button className={secondaryButton} disabled={visiblePage===1} onClick={()=>setDocumentPage(visiblePage-1)}>{translate('caseSupport.screens_previous_original')}</button><span>{translate('caseSupport.screens_page',{value1:visiblePage,value2:documentPages,value3:query.data?.items.length??0})}</span><button className={secondaryButton} disabled={visiblePage===documentPages} onClick={()=>setDocumentPage(visiblePage+1)}>{translate('caseSupport.screens_next_original')}</button></nav>}
          <details className={styles.selected}><summary>{translate('caseSupport.screens_selected_original',{value1:ids.length})}</summary>{ids.length>0&&<ul>{ids.map(id=><li key={id}>{query.data?.items.find(d=>d.documentId===id)?.fileName??translate('caseSupport.screens_document',{value1:id})}</li>)}</ul>}</details>
          <Link className={styles.addLink} href={`/cases/${caseId}/upload`}><Plus size={17} aria-hidden="true"/>{translate('caseSupport.bundle_addDocument')}</Link>
        </fieldset>
  );
}

function ReportHistory({caseId,onSelect}:{caseId:number;onSelect:(report:Report)=>void}) {
  const {translate}=useTranslation();
  const [page,setPage]=useState(1);
  const q=useReports(caseId,page);
  return (
    <details className={styles.history}><summary>{translate('caseSupport.screens_report_history')}</summary>
      {q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:q.isPending?<QueryFeedback pending/>:!q.data.items.length?<p className={styles.empty}>{translate('caseSupport.screens_report_history_empty')}</p>:q.data.items.map(r=><article key={r.reportId} className={styles.historyRow}><span className={styles.fileIcon}><FileText size={22} aria-hidden="true"/></span><div><h3>{translate('caseSupport.screens_report',{value1:r.reportId})}</h3><p>{translate(r.status==='READY'?'caseSupport.screens_complete':r.status==='PROCESSING'?'caseSupport.screens_p2':'caseSupport.screens_failure')} · {translate(r.isCurrent===true?'caseSupport.reportPresentation_current_input_basis':r.isCurrent===false?'caseSupport.reportPresentation_input_basis':'caseSupport.reportPresentation_current_notProvided')}</p><time>{r.createdAt}</time></div><button className={secondaryButton} onClick={()=>onSelect(r)}>{translate('caseSupport.screens_download_detail',{value1:r.reportId})}</button></article>)}
      <nav aria-label={translate('caseSupport.screens_report_history_page')} className={styles.pagination}><button className={secondaryButton} disabled={page===1||q.isFetching} onClick={()=>setPage(p=>p-1)}>{translate('caseSupport.screens_previous_report')}</button><span>{translate('caseSupport.screens_page_2',{value1:page})}</span><button className={secondaryButton} disabled={!q.data||q.isFetching||(q.data.total===undefined?q.data.items.length<20:page*20>=q.data.total)} onClick={()=>setPage(p=>p+1)}>{translate('caseSupport.screens_next_report')}</button></nav>
    </details>
  );
}
