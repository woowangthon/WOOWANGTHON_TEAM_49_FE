'use client';
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
export async function loadSnapshot(api:ApiClient,c:number,kind:SnapshotKind,id:number,version:number,signal?:AbortSignal){
 const config=snapshotKinds[kind];
 if(kind==='calculation'){const value=await resultsApi(api).calculation(c,id,signal);if(value.version!==version)throw new Error('스냅샷 버전이 일치하지 않습니다.');return value;}
 let page=1;
 while(true){
  signal?.throwIfAborted();
  const result=kind==='depositComparison'?await paymentsApi(api).history(c,page,signal):await resultsApi(api).history(c,kind==='comparison'?'comparisons':'payslip-validations',page,signal);
  const found=result.items.find(v=>config.id in v&&(v as Record<string,unknown>)[config.id]===id&&v.version===version);
  if(found)return found;
  if(!result.items.length||page*result.size>=result.total)throw new Error('이력에서 지정한 스냅샷을 찾을 수 없습니다. 삭제 또는 접근 권한을 확인하세요.');
  page++;
 }
}
export function SelectedSnapshot({caseId,selection}:{caseId:number;selection:{kind:SnapshotKind;id:number;version:number}|null}){
 const s=useSessionScope(),current=useResults(caseId,true);
 const q=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),'results','selected-snapshot',selection],enabled:s.enabled&&!!selection,queryFn:({signal})=>loadSnapshot(s.api,caseId,selection!.kind,selection!.id,selection!.version,signal),retry:false});
 if(!selection)return <p role="alert">스냅샷 종류 또는 식별자가 지원되지 않습니다. 아래 Case 결과를 확인하세요.</p>;
 const meta=current.data?.versions[selection.kind];const matches=meta?.snapshotId===selection.id&&meta.version===selection.version;
 return <section className={`${cardStyle} min-w-0 space-y-3`} aria-label="AI가 참조한 공식 결과 스냅샷"><h2 className="font-bold">참조 스냅샷 · Case #{caseId} · {selection.kind} · #{selection.id} · v{selection.version}</h2>
 <p>AI 답변과 별도로 조회한 서버 결과입니다.</p><p>{current.isError?'최신성 확인 실패':(!current.data||current.isFetching)?'최신성 확인 중':matches?`서버 최신성: ${meta.freshness}`:'과거 스냅샷 · 현재 결과와 다름 (CURRENT로 간주하지 않음)'}</p>
 {q.isPending?<QueryFeedback pending/>:q.isError?<><QueryFeedback error={q.error} retry={()=>void q.refetch()}/><p>지정한 스냅샷에 접근할 수 없습니다. 아래 Case 결과를 확인하세요.</p></>:<><p>아래 메타데이터는 스냅샷 저장 당시 값입니다. 현재 최신성은 위 안내를 확인하세요.</p><ServerValue value={q.data} caseId={caseId}/></>}</section>;
}
