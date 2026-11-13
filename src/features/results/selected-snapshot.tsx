"use client";
import {MessageError} from '@/i18n/message-error';

import { useTranslation } from '@/i18n/use-translation';

import { useQuery } from '@tanstack/react-query';
import { useSessionScope } from '@/hooks/use-session-scope';
import { businessKeys } from '@/lib/query/business-keys';
import { resultsApi } from './api';
import { paymentsApi } from '@/features/payments/api';
import { snapshotKinds,type SnapshotKind } from './snapshot-link';
import { ServerValue } from './result-screen';
import { QueryFeedback } from '@/components/ui/query-feedback';
import { useResults } from './queries';
import { cardStyle } from '@/components/ui/styles';
import type { ApiClient } from '@/lib/api/client';

export function SelectedSnapshot({caseId,selection}:{caseId:number;selection:{kind:SnapshotKind;id:number;version:number}|null}){
const {translate} = useTranslation();

 const s=useSessionScope(),current=useResults(caseId,true);
 const q=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),'results','selected-snapshot',selection],enabled:s.enabled&&!!selection,queryFn:({signal})=>loadSnapshot(s.api,caseId,selection!.kind,selection!.id,selection!.version,signal),retry:false});
 if(!selection)return <p role="alert">{translate("results.selectedSnapshot_result_confirm")}</p>;
 const meta=current.data?.versions[selection.kind];const matches=meta?.snapshotId===selection.id&&meta.version===selection.version;
 return <section className={`${cardStyle} min-w-0 space-y-3`} aria-label={translate("results.selectedSnapshot_reference_result")}><h2 className="font-bold">{translate("results.selectedSnapshot_reference", { value1: caseId, value2: selection.kind, value3: selection.id, value4: selection.version })}</h2>
 <p>{translate("results.selectedSnapshot_answer_result")}</p><p>{current.isError?translate("results.selectedSnapshot_current_confirm_failure"):(!current.data||current.isFetching)?translate("results.selectedSnapshot_current_confirm"):matches?translate("results.selectedSnapshot_current", { value1: meta.freshness }):translate("results.selectedSnapshot_current_result")}</p>
 {q.isPending?<QueryFeedback pending/>:q.isError?<><QueryFeedback error={q.error} retry={()=>void q.refetch()}/><p>{translate("results.selectedSnapshot_access_count_empty_result_confirm")}</p></>:<><p>{translate("results.selectedSnapshot_save_current_notice_confirm")}</p><ServerValue value={q.data} caseId={caseId}/></>}</section>;
}

export async function loadSnapshot(api:ApiClient,c:number,kind:SnapshotKind,id:number,version:number,signal?:AbortSignal){
 const config=snapshotKinds[kind];
 if(kind==='calculation'){const value=await resultsApi(api).calculation(c,id,signal);if(value.version!==version)throw new MessageError("results.selectedSnapshot_version_match");return value;}
 let page=1;
 while(true){
  signal?.throwIfAborted();
  const result=kind==='depositComparison'?await paymentsApi(api).history(c,page,signal):await resultsApi(api).history(c,kind==='comparison'?'comparisons':'payslip-validations',page,signal);
  const found=result.items.find(v=>config.id in v&&(v as Record<string,unknown>)[config.id]===id&&v.version===version);
  if(found)return found;
  if(!result.items.length||page*result.size>=result.total)throw new MessageError("results.selectedSnapshot_history_notFound_delete_access_permission_confirm");
  page++;
 }
}
