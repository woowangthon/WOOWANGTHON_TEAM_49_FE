"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys } from "@/lib/query/business-keys";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle,secondaryButton } from "@/components/ui/styles";
import { useRecomputeStatus } from "@/features/documents/queries";
import { paymentsApi } from "./api";
import type { DepositComparison } from "./comparison-schemas";
const labels={MATCH:"일치",DIFFERENCE:"차이 있음",INSUFFICIENT_INFORMATION:"정보 부족",REVIEW_REQUIRED:"검토 필요"};
export function ComparisonValues({value}:{value:DepositComparison}) {
 const money=(n:number|null)=>n===null?"미확인":`${n.toLocaleString()}원`;
 return <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]"><p>{labels[value.status]} · {value.freshness??"최신성 미제공"}</p><p>버전 {value.version} · 입력 기준 {value.basedOnInputVersion??"미제공"} · 생성 {value.createdAt??"미제공"}</p>{value.freshness&&value.freshness!=="CURRENT"&&<p>이전 결과입니다. 갱신 중이거나 실패한 상태에서도 이전 값을 보존합니다.</p>}<dl>{([['명세서 실수령액',value.payslipNetPay],['연결 계좌 입금',value.linkedBankDepositTotal],['연결 현금 지급',value.linkedCashPaymentTotal],['전체 연결 지급액',value.linkedPaymentTotal],['서버 반환 차액',value.difference]] as const).map(([label,n])=><div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd>{money(n)}</dd></div>)}</dl></div>;
}
export function DepositComparisonPanel({caseId}:{caseId:number}) {
 const s=useSessionScope();const [page,setPage]=useState(1);const [open,setOpen]=useState(false);useRecomputeStatus(caseId);
 const api=paymentsApi(s.api);const root=[...businessKeys.case(s.generation,caseId),"deposit-comparison"];
 const q=useQuery({queryKey:root,queryFn:()=>api.comparison(caseId),enabled:s.enabled});
 const h=useQuery({queryKey:[...root,"history",page],queryFn:()=>api.history(caseId,page),enabled:s.enabled&&open});
 return <section className={`${cardStyle} min-w-0 space-y-4`} aria-label="입금 대조"><h2 className="text-title font-bold">입금 대조</h2><Link className={secondaryButton} href={`/cases/${caseId}#payments`}>지급 거래·배분 관리</Link><p>표시 금액은 이 사례에 연결·배분된 지급 기준으로 근무지 원거래 전체 금액과 다를 수 있습니다. 연결 거래가 없으면 0원 지급으로 판단하지 않습니다. 차액은 확정된 미지급임금이 아닙니다.</p>{q.isError&&q.data&&<p role="alert">직전 조회 결과를 보존합니다. 최신성을 확인할 수 없습니다.</p>}{q.isError&&<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>} {q.data?<ComparisonValues value={q.data}/>:q.isPending?<QueryFeedback pending/>:!q.isError&&<p>입금 대조 결과가 없습니다.</p>}<details onToggle={e=>setOpen(e.currentTarget.open)}><summary>입금 대조 스냅샷 이력</summary>{open&&(h.isPending?<QueryFeedback pending/>:h.isError?<QueryFeedback error={h.error} retry={()=>void h.refetch()}/>:<div className="space-y-4">{!h.data.items.length&&<p>스냅샷 이력이 없습니다.</p>}{h.data.items.map(v=><article key={v.depositComparisonId}><p>과거 스냅샷 #{v.depositComparisonId} (당시 최신성)</p><ComparisonValues value={v}/></article>)}<button className={secondaryButton} disabled={page===1} onClick={()=>setPage(v=>v-1)}>이전 이력</button><span> {page} </span><button className={secondaryButton} disabled={page*20>=h.data.total} onClick={()=>setPage(v=>v+1)}>다음 이력</button></div>)}</details></section>;
}

