
import { translate } from "@/i18n/translate";
﻿import type { ReactNode } from 'react';
import { cardStyle, secondaryButton } from '@/components/ui/styles';
import type { Report } from './schemas';

/** Display only: availability is still checked by the existing download endpoint. */
export function ReportPresentation({ report:r, busy, downloadDisabled, download, feedback }: {
 report:Report; busy:boolean; downloadDisabled:boolean; download:(kind:'pdf'|'originals')=>void; feedback:ReactNode;
}) {
 const ready=r.status==='READY';
 return <article className={`${cardStyle} space-y-4`} aria-label={translate("caseSupport.reportPresentation_report", { value1: r.reportId })}>
  <header className="space-y-2 border-b border-border pb-4">
   <p className="text-caption font-bold">{r.isCurrent===true?translate("caseSupport.reportPresentation_current_input_basis"):r.isCurrent===false?translate("caseSupport.reportPresentation_input_basis"):translate("caseSupport.reportPresentation_current_notProvided")}</p>
   <h2 className="text-title font-extrabold">{translate("caseSupport.reportPresentation_report_consultation_record", { value1: r.reportId })}</h2>
   <p role="status">{ready?translate("caseSupport.reportPresentation_report_complete"):r.status==='PROCESSING'?translate("caseSupport.reportPresentation_report_2"):translate("caseSupport.reportPresentation_report_failure")} · {r.status}</p>
   <p>{translate("caseSupport.reportPresentation_p7")}<time>{r.createdAt}</time></p>
  </header>
  {r.isCurrent===false&&<p role="note">{translate("caseSupport.reportPresentation_input_report_current_result_minutes_confirm")}</p>}
  {r.status==='PROCESSING'&&<p>{translate("caseSupport.reportPresentation_status_automatic_confirm_complete_download_count_new")}</p>}
  {r.status==='FAILED'&&<p role="alert">{translate("caseSupport.reportPresentation_error_information_confirm_request_new_report_previous", { value1: r.errorCode??translate("caseSupport.reportPresentation_error_notProvided") })}</p>}
  {ready?<ul aria-label={translate("caseSupport.reportPresentation_report_download")} className="divide-y divide-border rounded-panel border border-border">
   {(['pdf','originals'] as const).map(kind=><li key={kind} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
    <div className="min-w-0"><h3 className="font-bold">{kind==='pdf'?translate("caseSupport.reportPresentation_consultation_report"):translate("caseSupport.reportPresentation_select_original")}</h3><p className="text-caption text-muted">{kind==='pdf'?'PDF':'ZIP'} · {r.createdAt}</p>{kind==='originals'&&!r.selectedDocumentIds.length&&<p className="text-caption">{translate("caseSupport.reportPresentation_selected_original_none_file_provided_download_confirm")}</p>}</div>
    <button className={secondaryButton} disabled={downloadDisabled} onClick={()=>download(kind)}>{kind==='pdf'?translate("caseSupport.reportPresentation_pdf_download"):translate("caseSupport.reportPresentation_original_download")}</button>
   </li>)}
  </ul>:<p>{translate("caseSupport.reportPresentation_download_count_empty")}</p>}
  {busy&&<p role="status">{translate("caseSupport.reportPresentation_download_request")}</p>}
  <details><summary>{translate("caseSupport.reportPresentation_reference_detail")}</summary><p>{translate("caseSupport.reportPresentation_basis_input_report_version", { value1: r.basedOnInputVersion, value2: r.version })}</p><p>{translate("caseSupport.reportPresentation_included_original", { value1: r.selectedDocumentIds.join(', ')||translate("caseSupport.reportPresentation_none") })}</p><p>{translate("caseSupport.reportPresentation_version", { value1: r.ruleSetVersions?.join(', ')??translate("common.notProvided") })}</p><dl>{Object.entries(r.referencedSnapshots).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value.snapshotId??translate("caseSupport.reportPresentation_none")}</dd></div>)}</dl></details>
  {feedback}
 </article>;
}
