"use client";
import { useTranslation } from '@/i18n/use-translation';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys } from "@/lib/query/business-keys";
import { paymentsApi } from "./api";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle,secondaryButton } from "@/components/ui/styles";
import type { Transaction } from "./schemas";
export function DuplicateCandidates({workplaceId,onSelect}:{workplaceId:number;onSelect:(t:Transaction)=>void}) {
 const {translate} = useTranslation();

 const s=useSessionScope();const [selected,setSelected]=useState<number>();const api=paymentsApi(s.api);
 const q=useQuery({queryKey:[...businessKeys.workplace(s.generation,workplaceId),"duplicates"],queryFn:()=>api.duplicates(workplaceId),enabled:s.enabled});
 return <section className={`${cardStyle} space-y-3`} aria-label={translate("payments.duplicateCandidates_duplicate_transaction_candidate")}><h3 className="font-bold">{translate("payments.duplicateCandidates_duplicate_transaction_candidate")}</h3><p>{translate("payments.duplicateCandidates_amount_payment_transaction_comparison_automatic_delete")}</p>{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:!q.data.candidates.length?<p>{translate("payments.duplicateCandidates_duplicate_candidate_empty")}</p>:q.data.candidates.map((pair,index)=><div key={index} className="space-y-3 border-t border-border pt-3">{pair.transactionIds.map(id=><Candidate key={id} id={id} reasons={[pair.reason]} workplaceId={workplaceId} selected={selected===id} onSelect={t=>{setSelected(t.transactionId);onSelect(t);}}/>)}</div>)}</section>;
}
function Candidate({id,workplaceId,reasons,selected,onSelect}:{id:number;workplaceId:number;reasons?:string[];selected:boolean;onSelect:(t:Transaction)=>void}) {
 const {translate, locale: defaultLocale} = useTranslation();

 const s=useSessionScope();const q=useQuery({queryKey:[...businessKeys.workplace(s.generation,workplaceId),"transaction",id],queryFn:()=>paymentsApi(s.api).detail(workplaceId,id),enabled:s.enabled});
 return <article className="min-w-0 [overflow-wrap:anywhere]">{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error}/>:<><p>{translate("payments.duplicateCandidates_transaction", { value1: id, value2: q.data.transactionDate, value3: q.data.amount.toLocaleString(defaultLocale), value4: q.data.paymentMethod==="CASH"?translate("payments.duplicateCandidates_cash"):translate("payments.paymentScreen_bankAccount_deposit"), value5: q.data.sender??translate("payments.paymentScreen_deposit_notProvided"), value6: q.data.source })}</p><p>{reasons?.join(', ')??translate("payments.duplicateCandidates_notProvided")}</p><button aria-pressed={selected} className={secondaryButton} onClick={()=>onSelect(q.data)}>{translate("payments.duplicateCandidates_candidate_detail_confirm", { value1: id })}</button></>}</article>;
}
