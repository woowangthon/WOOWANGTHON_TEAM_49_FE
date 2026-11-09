"use client";
import { useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { useFieldHistory } from "../queries";
import { displayValue } from "../view-models";
export function FieldHistory({caseId,documentId,fieldId}:{caseId:number;documentId:number;fieldId:number}){
  const [page,setPage]=useState(1);const q=useFieldHistory(caseId,documentId,fieldId,page);
  if(q.isPending)return <QueryFeedback pending />;if(q.isError)return <QueryFeedback error={q.error} retry={()=>{void q.refetch();}} />;
  return <section className="mt-4 min-w-0 space-y-3" aria-label="필드 수정 이력"><h4 className="text-body font-bold">수정 이력</h4>
    {!q.data.items.length?<p>수정 이력이 없습니다.</p>:<ol className="space-y-3">{q.data.items.map(h=><li className="break-words rounded-control border border-border p-3" key={h.historyId}><p>{displayValue(h.previousValue)} → {displayValue(h.newValue)}</p><p>{new Date(h.changedAt).toLocaleString("ko-KR")}</p><p>변경 주체: {h.changedBy==="USER"?"사용자":h.changedBy==="SYSTEM"?"시스템":h.changedBy} · 범위: {h.scope==="SHARED_DEFAULT"?"공유 기본값":h.scope==="CASE_OVERRIDE"?"이 사례의 재정의":h.scope}</p></li>)}</ol>}
    <Pagination page={q.data.page} size={q.data.size} total={q.data.total} onPage={setPage} busy={q.isFetching} />
  </section>;
}
