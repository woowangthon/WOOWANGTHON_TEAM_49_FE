"use client";
import { useTranslation } from '@/i18n/use-translation';

import type { ReactNode } from 'react';
import { cardStyle, secondaryButton } from '@/components/ui/styles';
import type { Report } from './schemas';
import { Download, Eye, FileArchive, FileCheck2, LoaderCircle } from 'lucide-react';
import styles from './reports-screen.module.css';

/** Display only: availability is still checked by the existing download endpoint. */
export function ReportPresentation({ report:r, busy, downloadDisabled, download, preview, feedback }: {
 report:Report; busy:boolean; downloadDisabled:boolean; download:(kind:'pdf'|'originals')=>void; preview?:()=>void; feedback:ReactNode;
}) {
 const {translate} = useTranslation();

 const ready=r.status==='READY';
 return <article className={`${cardStyle} ${styles.artifact} space-y-4`} aria-label={translate("caseSupport.reportPresentation_report", { value1: r.reportId })}>
  <header className="space-y-2 border-b border-border pb-4">
   <p className="text-caption font-bold">{r.isCurrent===true?translate("caseSupport.reportPresentation_current_input_basis"):r.isCurrent===false?translate("caseSupport.reportPresentation_input_basis"):translate("caseSupport.reportPresentation_current_notProvided")}</p>
   <h3 className="text-title font-extrabold">{translate(ready?'caseSupport.bundle_readyTitle':r.status==='PROCESSING'?'caseSupport.bundle_processingTitle':'caseSupport.bundle_failedTitle')}</h3>
   <p role="status">{ready?translate("caseSupport.reportPresentation_report_complete"):r.status==='PROCESSING'?translate("caseSupport.reportPresentation_report_2"):translate("caseSupport.reportPresentation_report_failure")} · {r.status}</p>
   <p>{translate("caseSupport.reportPresentation_p7")}<time>{r.createdAt}</time></p>
  </header>
  {r.isCurrent===false&&<p role="note">{translate("caseSupport.reportPresentation_input_report_current_result_minutes_confirm")}</p>}
  {Object.values(r.referencedSnapshots).some(snapshot=>snapshot.snapshotId===null)&&<p role="note">{translate("caseSupport.missingSnapshots")}</p>}
  {Object.entries(r.referencedSnapshots).some(([,snapshot])=>snapshot.freshness!=='CURRENT')&&<ul>{Object.entries(r.referencedSnapshots).filter(([,snapshot])=>snapshot.freshness!=='CURRENT').map(([name,snapshot])=><li key={name}>{name}: {snapshot.freshness}</li>)}</ul>}
  {r.status==='PROCESSING'&&<p className={styles.processing}><LoaderCircle size={22} aria-hidden="true"/>{translate("caseSupport.reportPresentation_status_automatic_confirm_complete_download_count_new")}</p>}
  {r.status==='FAILED'&&<p role="alert">{translate("caseSupport.reportPresentation_error_information_confirm_request_new_report_previous", { value1: r.errorCode??translate("caseSupport.reportPresentation_error_notProvided") })}</p>}
  {ready?<ul aria-label={translate("caseSupport.reportPresentation_report_download")} className="divide-y divide-border rounded-panel border border-border">
   {(['pdf',...(r.selectedDocumentIds.length?['originals' as const]:[])] as const).map(kind=><li key={kind} className={styles.downloadRow}>
    <span className={styles.fileIcon}>{kind==='pdf'?<FileCheck2 size={26} aria-hidden="true"/>:<FileArchive size={26} aria-hidden="true"/>}</span>
    <div className="min-w-0"><h4 className="font-bold">{kind==='pdf'?translate("caseSupport.reportPresentation_consultation_report"):translate("caseSupport.bundle_originalCount",{count:r.selectedDocumentIds.length})}</h4><p className="text-caption text-muted">{kind==='pdf'?'PDF':'ZIP'} · {r.createdAt}</p></div>
    <div className={styles.fileActions}>{kind==='pdf'&&preview&&<button className={secondaryButton} disabled={downloadDisabled} onClick={preview}><Eye size={18} aria-hidden="true"/>{translate('caseSupport.bundle_preview')}</button>}<button className={secondaryButton} disabled={downloadDisabled} onClick={()=>download(kind)}><Download size={18} aria-hidden="true"/>{kind==='pdf'?translate("caseSupport.reportPresentation_pdf_download"):translate("caseSupport.reportPresentation_original_download")}</button></div>
   </li>)}
  </ul>:<p>{translate("caseSupport.reportPresentation_download_count_empty")}</p>}
  {ready&&<p className={styles.help}>{translate(r.selectedDocumentIds.length?'caseSupport.bundle_separateFiles':'caseSupport.bundle_noOriginals')}</p>}
  {busy&&<p role="status">{translate("caseSupport.reportPresentation_download_request")}</p>}
  <details><summary>{translate("caseSupport.reportPresentation_reference_detail")}</summary><p>{translate("caseSupport.reportPresentation_basis_input_report_version", { value1: r.basedOnInputVersion, value2: r.version })}</p><p>{translate("caseSupport.reportPresentation_included_original", { value1: r.selectedDocumentIds.join(', ')||translate("caseSupport.reportPresentation_none") })}</p><p>{translate("caseSupport.reportPresentation_version", { value1: r.ruleSetVersions?.join(', ')??translate("common.notProvided") })}</p><dl>{Object.entries(r.referencedSnapshots).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value.snapshotId??translate("caseSupport.reportPresentation_none")}</dd></div>)}</dl></details>
  {feedback}
 </article>;
}
