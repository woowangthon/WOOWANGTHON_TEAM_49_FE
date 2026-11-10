"use client";
import Link from "next/link";
import { useRef,useState } from "react";
import { useQuery,useMutation } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import { useRecomputeStatus, useDocuments } from "@/features/documents/queries";
import { useResults } from "@/features/results/queries";
import { businessKeys } from "@/lib/query/business-keys";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle,secondaryButton } from "@/components/ui/styles";
import { supportApi } from "./api";
import { saveDownload } from "@/lib/api/download";
import type { Report } from "./schemas";
export function SupportLinks({caseId}:{caseId:number}) {return <nav aria-label="후속 확인" className="flex flex-wrap gap-3"><Link className={secondaryButton} href={`/cases/${caseId}/questions`}>확인 질문</Link><Link className={secondaryButton} href={`/cases/${caseId}/company-inquiry`}>회사 문의 초안</Link><Link className={secondaryButton} href={`/cases/${caseId}/reports`}>보고서</Link><Link className={secondaryButton} href="/consultation-centers">상담기관</Link></nav>}
export function QuestionsScreen({caseId}:{caseId:number}) {
 const s=useSessionScope();const removal=useCaseRemoval(caseId);
 const q=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),"questions"],enabled:s.enabled&&!removal.pending&&!removal.removed,queryFn:({signal})=>supportApi(s.api).questions(caseId,signal),staleTime:0});
 return <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]"><h1>Case 확인 질문</h1><SupportLinks caseId={caseId}/>{q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:q.isPending?<QueryFeedback pending/>:!q.data.questions.length?<p>서버가 제공한 확인 질문이 없습니다.</p>:q.data.questions.map(v=><article className={cardStyle} key={v.questionId}><h2>{v.question}</h2><p>{v.type} · {v.reason}</p><p>관련 항목: {v.relatedItemId??"미제공"}</p><div className="flex flex-wrap gap-3"><Link className={secondaryButton} href={`/cases/${caseId}/conditions`}>계산 조건 확인</Link><Link className={secondaryButton} href={`/cases/${caseId}/manual-records`}>수기 자료</Link><Link className={secondaryButton} href={`/cases/${caseId}/review`}>문서 검토</Link></div></article>)}</div>
}
export { InquiryScreen } from "./inquiry-screen";
export function ReportsScreen({caseId}:{caseId:number}) {
 const s=useSessionScope();const removed=useCaseRemoval(caseId);const root=[...businessKeys.case(s.generation,caseId),"reports"];const [ids,setIds]=useState<number[]>([]);const [ack,setAck]=useState(false);const lock=useRef(false);const retryKey=useRef<{body:string;key:string}|null>(null);
 useRecomputeStatus(caseId);
 const results=useResults(caseId,true);const docs=useDocuments({kind:"case",id:caseId},{page:1,size:100});
 const [page,setPage]=useState(1);
 const q=useQuery({queryKey:[...root,"list",page],enabled:s.enabled&&!removed.pending&&!removed.removed,queryFn:({signal})=>supportApi(s.api).reports(caseId,signal,page),staleTime:0,refetchInterval:q=>q.state.error?false:q.state.data?.items.some(r=>r.status==="PROCESSING")?2000:false});
 const create=useMutation({gcTime:0,mutationFn:()=>{const selected=[...ids];if(selected.some(id=>!docs.data?.items.some(d=>d.documentId===id)))throw new Error("선택한 원본을 다시 확인하세요.");const body=JSON.stringify(selected);if(retryKey.current?.body!==body)retryKey.current={body,key:crypto.randomUUID()};return supportApi(s.api).create(caseId,selected,retryKey.current!.key)},onSuccess:async()=>{retryKey.current=null;setAck(false);if(s.session.getSnapshot().generation===s.generation)await s.queryClient.invalidateQueries({queryKey:root})}});
 return <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]"><h1>보고서 생성·이력</h1><SupportLinks caseId={caseId}/><p>AI 답변은 공식 계산 스냅샷이 아닙니다. 최신 서버 결과로 보고서를 요청합니다.</p><p>현재 입력 버전: {results.data?.currentInputVersion??"미제공"} · 결과 버전: {results.data?.resultVersion??"없음"}</p><p>결과 최신성: {results.data?.freshness.overall??"미확인"}</p><p>외부에 저장한 PDF/ZIP은 서버에서 삭제해도 회수할 수 없습니다.</p><fieldset className={cardStyle}><legend>함께 포함할 연결 원본 (선택)</legend>{docs.isPending?<QueryFeedback pending/>:docs.isError?<QueryFeedback error={docs.error} retry={()=>void docs.refetch()}/>:docs.data.items.map(d=><label key={d.documentId} className="block"><input type="checkbox" checked={ids.includes(d.documentId)} onChange={e=>setIds(a=>e.target.checked?[...a,d.documentId]:a.filter(id=>id!==d.documentId))}/>{d.fileName}</label>)}</fieldset><label className="block"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>선택 문서와 현재 결과로 보고서 생성을 요청합니다.</label><button className={secondaryButton} disabled={!ack||create.isPending||results.isPending||results.isError||docs.isPending||docs.isError||removed.removed} onClick={async()=>{if(lock.current)return;lock.current=true;try{await create.mutateAsync()}catch{}finally{lock.current=false}}}>보고서 생성 요청</button>{create.isSuccess&&<p role="status">비동기 접수되었습니다. 아래에서 PDF 완료 상태를 확인하세요.</p>}{create.isError&&<><QueryFeedback error={create.error}/><p>REPORT_SOURCE_STALE: 최신 갱신 후 재요청하세요. INVALID_DOCUMENT_SELECTION: 문서 연결과 권한을 확인하세요.</p></>}{q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:q.isPending?<QueryFeedback pending/>:!q.data.items.length?<p>보고서 이력이 없습니다.</p>:q.data.items.map(r=><ReportCard key={r.reportId} caseId={caseId} initial={r}/>)}<nav aria-label="보고서 이력 페이지" className="flex flex-wrap gap-3"><button className={secondaryButton} disabled={page===1||q.isFetching} onClick={()=>setPage(p=>p-1)}>이전 보고서</button><span>{page}페이지</span><button className={secondaryButton} disabled={!q.data||q.isFetching||(q.data.total===undefined ? q.data.items.length<20 : page*20>=q.data.total)} onClick={()=>setPage(p=>p+1)}>다음 보고서</button></nav></div>
}
function ReportCard({caseId,initial}:{caseId:number;initial:Report}) {const s=useSessionScope();const removal=useCaseRemoval(caseId);const [busy,setBusy]=useState(false);const downloadLock=useRef(false);const [error,setError]=useState<Error|null>(null);const q=useQuery({queryKey:[...businessKeys.case(s.generation,caseId),"reports",initial.reportId],enabled:s.enabled&&!removal.pending&&!removal.removed,queryFn:({signal})=>supportApi(s.api).report(caseId,initial.reportId,signal),refetchInterval:q=>q.state.error?false:(q.state.data??initial).status==="PROCESSING"?2000:false});const r=q.data??initial;
 async function download(kind:"pdf"|"originals") {
  if(downloadLock.current)return;downloadLock.current=true;setBusy(true);setError(null);
  try { const type=kind==="pdf"?"application/pdf":"application/zip";
   const file=await s.api.requestDownload(`/cases/${caseId}/reports/${r.reportId}/${kind}`,type,`report-${r.reportId}.${kind==="pdf"?"pdf":"zip"}`);
   saveDownload(file);
  } catch(e) {setError(e instanceof Error?e:new Error("다운로드 실패"));} finally {downloadLock.current=false;setBusy(false);}
 }

 return <article className={cardStyle}><h2>보고서 #{r.reportId} · v{r.version}</h2><p>{r.status} · {r.createdAt}</p><p>기준 입력 {r.basedOnInputVersion} · {r.isCurrent===true?"현재 입력 기준":r.isCurrent===false?"과거 입력 기준":"최신성 미제공"}</p><p>포함 원본 ID: {r.selectedDocumentIds.join(", ")||"없음"}</p><p>규칙 버전: {r.ruleSetVersions?.join(", ")??"미제공"}</p><dl>{Object.entries(r.referencedSnapshots).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v??"없음"}</dd></div>)}</dl>{q.isError&&<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>} {r.status==="FAILED"&&<p role="alert">관련 항목: {r.errorCode??"오류 코드 미제공"}. 원인을 확인한 후 새 보고서를 요청하세요.</p>}<div className="flex flex-wrap gap-3">{(["pdf","originals"] as const).map(k=><button className={secondaryButton} key={k} disabled={r.status!=="READY"||busy||q.isError||!q.data||removal.pending||removal.removed} onClick={()=>void download(k)}>{k==="pdf"?"PDF 다운로드":"원본 ZIP 다운로드"}</button>)}</div>{error&&<><QueryFeedback error={error}/><p>REPORT_NOT_READY이면 보고서 상태를 다시 확인하세요.</p></>}</article>
}
