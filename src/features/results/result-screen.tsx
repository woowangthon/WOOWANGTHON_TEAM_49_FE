"use client";
import { translate } from "@/i18n/translate";

import { Info } from "lucide-react";
import { useCase } from "@/features/cases/queries";
import styles from "./result-screen.module.css";
import { ResultNextSteps, ResultSummary } from "./result-presentation";
import { ResultExplorer } from "./result-explorer";
import { SelectedSnapshot } from "./selected-snapshot";
import type { SnapshotKind } from "./snapshot-link";
import { useRecomputeStatus } from "@/features/documents/queries";
import { SourceEvidence } from "./source-evidence";
import { displayScalar, resultRows, toResultsViewModel } from "./view-models";
import Link from "next/link";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { useResults } from "./queries";
export function ServerValue({value,caseId,fieldKey,unit}:{value:unknown;caseId:number;fieldKey?:string;unit?:string|null}) {
 if(value===null || typeof value!=="object")return <span>{displayScalar(value,fieldKey,unit)}</span>;
 if(Array.isArray(value))return value.length?<div className="space-y-3">{value.map((v,i)=><div key={i} className="border-l-2 border-line pl-3"><ServerValue value={v} caseId={caseId} fieldKey={fieldKey==="items"?"resultItem":undefined} unit={unit}/></div>)}</div>:<p>{translate("results.resultScreen_provided_item_none")}</p>;
 const obj=value as Record<string,unknown>;
 if(typeof obj.documentId==="number")return <SourceEvidence caseId={caseId} value={obj}/>;
 const validation=fieldKey==="paymentTotal"||fieldKey==="deductionTotal"||fieldKey==="netPay";
 if(fieldKey==="resultItem" && !Object.keys(obj).length)return <p>{translate("results.resultScreen_detail_item_notProvided")}</p>;
 return <dl className="min-w-0 space-y-3 [overflow-wrap:anywhere]">{resultRows(obj,validation?"KRW":fieldKey==="counts"?"COUNT":unit).map(row=><div key={row.key} className="min-w-0"><dt className="font-bold">{row.label}</dt><dd className="pl-2"><ServerValue value={row.value} caseId={caseId} fieldKey={row.key} unit={row.unit}/></dd></div>)}</dl>;
}
export function ResultScreen({caseId, selection, returnTo}:{caseId:number;compare?:boolean;selection?:{kind:SnapshotKind;id:number;version:number}|null;returnTo?:string}) {
 const context=useCase(caseId);
 const q=useResults(caseId); const status=useRecomputeStatus(caseId);
 const vm=q.data?toResultsViewModel(q.data):undefined;
 return <div className={styles.screen}>
 <header className={styles.header}><div><p className={styles.eyebrow}>{translate("results.resultScreen_wage")}</p><h1>{translate("results.resultScreen_wage_confirm")}</h1><p>{translate("results.resultScreen_calculation_amount_difference_confirm")}</p></div></header>
 {!context.data && <QueryFeedback pending={context.isPending} error={context.error} retry={()=>void context.refetch()}/>}

 {returnTo&&<Link href={returnTo} className={secondaryButton}>{translate("results.resultScreen_div4")}</Link>}{selection!==undefined&&<SelectedSnapshot caseId={caseId} selection={selection}/>}
 {!q.data ? <QueryFeedback pending={q.isPending} error={q.error} retry={()=>void q.refetch()}/> : <>
 {q.isError && <><p role="alert">{translate("results.resultScreen_current_result_failure_previous_retry_confirm")}</p><QueryFeedback error={q.error} retry={()=>void q.refetch()}/></>}
 <div className={styles.overview}><ResultSummary compare={false} value={{...vm!,title:q.isError?translate("results.resultPresentation_previous_result_current_confirm"):vm!.title}}/><ResultNextSteps value={vm!} caseId={caseId}/></div>
 <p className={styles.notice}><Info size={16} aria-hidden="true"/><span>{translate("results.resultScreen_difference_unpaid_wage_deduction")}</span></p>
 {q.data.freshness.overall==="FAILED"&&<p role="alert">{translate("results.resultScreen_result_update_failure_previous")}<button className={secondaryButton} onClick={()=>{void q.refetch();void status.refetch();}}>{translate("results.resultScreen_update_status_retry_confirm")}</button></p>}
 <ResultExplorer key={caseId} data={q.data} compare={false} showDetailsInitially={false} freshnessUnverified={q.isError}/>
<nav data-case-next aria-label={translate("results.resultScreen_result")}><div><h2>{translate("results.resultScreen_confirm_question")}</h2><p>{translate("results.resultScreen_insufficient_record_company_content")}</p></div><Link className={secondaryButton} href={`/cases/${caseId}/questions`}>{translate("results.resultScreen_confirm_question_consultation")}</Link></nav>
 </>}</div>;
}
