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
 return <section className={`${cardStyle} space-y-3`} aria-label="중복 거래 후보"><h3 className="font-bold">중복 거래 후보</h3><p>같은 날짜·금액·지급방법으로 기록된 거래를 비교해 보세요. 자동으로 합치거나 삭제하지 않아요.</p>{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:!q.data.candidates.length?<p>중복 후보가 없습니다.</p>:q.data.candidates.map((pair,index)=><div key={index} className="space-y-3 border-t border-border pt-3">{pair.transactionIds.map(id=><Candidate key={id} id={id} reasons={[pair.reason]} workplaceId={workplaceId} selected={selected===id} onSelect={t=>{setSelected(t.transactionId);onSelect(t);}}/>)}</div>)}</section>;
}
function Candidate({id,workplaceId,reasons,selected,onSelect}:{id:number;workplaceId:number;reasons?:string[];selected:boolean;onSelect:(t:Transaction)=>void}) {
 const s=useSessionScope();const q=useQuery({queryKey:[...businessKeys.workplace(s.generation,workplaceId),"transaction",id],queryFn:()=>paymentsApi(s.api).detail(workplaceId,id),enabled:s.enabled});
 return <article className="min-w-0 [overflow-wrap:anywhere]">{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error}/>:<><p>거래 #{id} · {q.data.transactionDate} · {q.data.amount.toLocaleString()}원 · {q.data.paymentMethod==="CASH"?"현금":"계좌 입금"} · {q.data.sender??"입금자 미제공"} · {q.data.source}</p><p>{reasons?.join(', ')??"판정 사유 미제공"}</p><button aria-pressed={selected} className={secondaryButton} onClick={()=>onSelect(q.data)}>후보 상세 확인 #{id}</button></>}</article>;
}
