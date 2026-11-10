"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys } from "@/lib/query/business-keys";
import { paymentsApi } from "./api";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle,secondaryButton } from "@/components/ui/styles";
import type { Transaction } from "./schemas";
export function DuplicateCandidates({workplaceId,onSelect}:{workplaceId:number;onSelect:(t:Transaction)=>void}) {
 const s=useSessionScope();const [selected,setSelected]=useState<number>();const api=paymentsApi(s.api);
 const q=useQuery({queryKey:[...businessKeys.workplace(s.generation,workplaceId),"duplicates"],queryFn:()=>api.duplicates(workplaceId),enabled:s.enabled});
 return <section className={`${cardStyle} space-y-3`} aria-label="중복 거래 후보"><h3 className="font-bold">중복 거래 후보</h3><p>서버 후보를 표시합니다. 자동 병합·삭제하지 않습니다. 후보 상세 구조는 계약 확인 대상입니다.</p>{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:!q.data.items.length?<p>중복 후보가 없습니다.</p>:q.data.items.map(v=><Candidate key={v.transactionId} id={v.transactionId} reasons={v.matchReasons} workplaceId={workplaceId} selected={selected===v.transactionId} onSelect={t=>{setSelected(t.transactionId);onSelect(t);}}/>)}</section>;
}
function Candidate({id,workplaceId,reasons,selected,onSelect}:{id:number;workplaceId:number;reasons?:string[];selected:boolean;onSelect:(t:Transaction)=>void}) {
 const s=useSessionScope();const q=useQuery({queryKey:[...businessKeys.workplace(s.generation,workplaceId),"transaction",id],queryFn:()=>paymentsApi(s.api).detail(workplaceId,id),enabled:s.enabled});
 return <article className="min-w-0 [overflow-wrap:anywhere]">{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error}/>:<><p>거래 #{id} · {q.data.transactionDate} · {q.data.amount.toLocaleString()}원 · {q.data.paymentMethod==="CASH"?"현금":"계좌 입금"} · {q.data.sender??"입금자 미제공"} · {q.data.source}</p><p>{reasons?.join(', ')??"판정 사유 미제공"}</p><button aria-pressed={selected} className={secondaryButton} onClick={()=>onSelect(q.data)}>후보 상세 확인 #{id}</button></>}</article>;
}
