"use client";
import {useLocalized} from '@/i18n/use-translation';
import type {Translation} from '@/i18n/translate';

import { useTranslation } from '@/i18n/use-translation';

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

export function ComparisonValues({value}:{value:DepositComparison}) {
const {labels} = useLocalized(createPresentation);

 const {translate, locale: defaultLocale} = useTranslation();

 const money=(n:number|null)=>n===null?translate("payments.comparisonPanel_confirm"):translate("payments.comparisonPanel_comparisonValues_money2", { value1: n.toLocaleString(defaultLocale) });
 return <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]"><p>{labels[value.status]} · {value.freshness??translate("payments.comparisonPanel_current_notProvided")}</p><p>{translate("payments.comparisonPanel_version_input_basis", { value1: value.version, value2: value.basedOnInputVersion??translate("common.notProvided"), value3: value.createdAt??translate("common.notProvided") })}</p>{value.freshness&&value.freshness!=="CURRENT"&&<p>{translate("payments.comparisonPanel_previous_result_update_failure_status")}</p>}<dl>{([[translate("payments.comparisonPanel_payslip_netPay"),value.payslipNetPay],[translate("payments.comparisonPanel_link_bankAccount_deposit"),value.linkedBankDepositTotal],[translate("payments.comparisonPanel_link_cash_payment"),value.linkedCashPaymentTotal],[translate("payments.comparisonPanel_all_link_payment"),value.linkedPaymentTotal],[translate("payments.comparisonPanel_dl5"),value.difference]] as const).map(([label,n])=><div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd>{money(n)}</dd></div>)}</dl></div>;
}
export function DepositComparisonPanel({caseId}:{caseId:number}) {
 const {translate} = useTranslation();

 const s=useSessionScope();const [page,setPage]=useState(1);const [open,setOpen]=useState(false);useRecomputeStatus(caseId);
 const api=paymentsApi(s.api);const root=[...businessKeys.case(s.generation,caseId),"deposit-comparison"];
 const q=useQuery({queryKey:root,queryFn:()=>api.comparison(caseId),enabled:s.enabled});
 const h=useQuery({queryKey:[...root,"history",page],queryFn:()=>api.history(caseId,page),enabled:s.enabled&&open});
 return <section className={`${cardStyle} min-w-0 space-y-4`} aria-label={translate("payments.comparisonPanel_deposit_comparison")}><h2 className="text-title font-bold">{translate("payments.comparisonPanel_deposit_comparison")}</h2><Link className={secondaryButton} href={`/cases/${caseId}#payments`}>{translate("payments.comparisonPanel_payment_transaction_allocation")}</Link><p>{translate("payments.comparisonPanel_amount_case_link_allocation_payment_basis_workplace")}</p>{q.isError&&q.data&&<p role="alert">{translate("payments.comparisonPanel_previous_result_current_confirm_count_empty")}</p>}{q.isError&&<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>} {q.data?<ComparisonValues value={q.data}/>:q.isPending?<QueryFeedback pending/>:!q.isError&&<p>{translate("payments.comparisonPanel_deposit_comparison_result_empty")}</p>}<details onToggle={e=>setOpen(e.currentTarget.open)}><summary>{translate("payments.comparisonPanel_deposit_comparison_history")}</summary>{open&&(h.isPending?<QueryFeedback pending/>:h.isError?<QueryFeedback error={h.error} retry={()=>void h.refetch()}/>:<div className="space-y-4">{!h.data.items.length&&<p>{translate("payments.comparisonPanel_history_empty")}</p>}{h.data.items.map(v=><article key={v.depositComparisonId}><p>{translate("payments.comparisonPanel_current", { value1: v.depositComparisonId })}</p><ComparisonValues value={v}/></article>)}<button className={secondaryButton} disabled={page===1} onClick={()=>setPage(v=>v-1)}>{translate("payments.comparisonPanel_previous_history")}</button><span> {page} </span><button className={secondaryButton} disabled={page*20>=h.data.total} onClick={()=>setPage(v=>v+1)}>{translate("payments.comparisonPanel_next_history")}</button></div>)}</details></section>;
}

function createPresentation({translate}: Translation) {
const labels={MATCH:translate("payments.comparisonPanel_match"),DIFFERENCE:translate("payments.comparisonPanel_difference"),INSUFFICIENT_INFORMATION:translate("payments.comparisonPanel_information_insufficient"),REVIEW_REQUIRED:translate("common.reviewRequired")};
return {labels};
}
