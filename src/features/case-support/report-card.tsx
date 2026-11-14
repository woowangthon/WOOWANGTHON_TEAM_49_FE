"use client";

import { useEffect, useRef, useState } from 'react';
import { useSessionScope } from '@/hooks/use-session-scope';
import { useCaseRemoval } from '@/features/cases/queries';
import { useMessageState } from '@/i18n/use-message-state';
import { MessageError } from '@/i18n/message-error';
import { useTranslation } from '@/i18n/use-translation';
import { saveDownload } from '@/lib/api/download';
import { QueryFeedback } from '@/components/ui/query-feedback';
import { useReport } from './queries';
import { ReportPresentation } from './report-presentation';
import { ReportPdfPreview } from './report-pdf-preview';
import type { Report } from './schemas';

export function ReportCard({caseId,initial}:{caseId:number;initial:Report}) {
  const {translate}=useTranslation();
  const s=useSessionScope(), removal=useCaseRemoval(caseId);
  const [busy,setBusy]=useState(false), [preview,setPreview]=useState<{blob:Blob;filename:string}|null>(null);
  const [error,setError]=useMessageState<Error|null>(null);
  const controller=useRef<AbortController|null>(null), lock=useRef(false);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const q=useReport(caseId,initial);
  const report=q.data??initial;
  const unavailable=busy||q.isError||!q.data||removal.pending||removal.removed;
  async function action(kind:'pdf'|'originals'|'preview') {
    if(lock.current||unavailable)return;
    lock.current=true;setBusy(true);setError(null);
    const request=new AbortController();controller.current=request;
    try {
      const zip=kind==='originals';
      const file=await s.api.requestDownload(`/cases/${caseId}/reports/${report.reportId}/${zip?'originals':'pdf'}`,zip?'application/zip':'application/pdf',`report-${report.reportId}.${zip?'zip':'pdf'}`,{signal:request.signal});
      if(request.signal.aborted||s.session.getSnapshot().generation!==s.generation)return;
      if(kind==='preview')setPreview(file);else saveDownload(file);
    } catch(cause) {
      if(!request.signal.aborted)setError(cause instanceof Error?cause:new MessageError('caseSupport.screens_download_failure'));
    } finally {lock.current=false;if(!request.signal.aborted)setBusy(false)}
  }
  return <>
    <ReportPresentation report={report} busy={busy} downloadDisabled={unavailable} download={kind=>void action(kind)} preview={()=>void action('preview')} feedback={<>{q.isError&&<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>}{error&&<><QueryFeedback error={error}/><p>{translate('caseSupport.screens_report_status_retry_confirm')}</p></>}</>}/>
    {preview&&!q.isError&&q.data?.status==='READY'&&!removal.pending&&!removal.removed&&<ReportPdfPreview file={preview} onClose={()=>setPreview(null)}/>}
  </>;
}
