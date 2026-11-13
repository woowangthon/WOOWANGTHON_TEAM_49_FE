"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesResultsViewModels} from './view-models';

import { useTranslation } from '@/i18n/use-translation';

﻿import { cardStyle } from "@/components/ui/styles";

import { ServerValue } from "./result-screen";
import Link from "next/link";
import { ArrowRight, FileCheck2, MessageSquareText, ReceiptText } from "lucide-react";
import styles from "./result-screen.module.css";
type Model = ReturnType<ReturnType<typeof createLocalizedFeaturesResultsViewModels>["toResultsViewModel"]>;
function Badge({status}:{status:string|null|undefined}) {
const {statusLabels} = useLocalized(createLocalizedFeaturesResultsViewModels);

 const {translate} = useTranslation();
 return <span className="inline-block rounded-full bg-neutral-soft px-3 py-1 text-sm font-bold">{status ? statusLabels[status] ?? status : translate("results.resultComparisonTable_status_notProvided")}</span>; }
export function ResultSummary({value,compare=false}:{value:Model;compare?:boolean}) {
const {displayScalar} = useLocalized(createLocalizedFeaturesResultsViewModels);

 const {translate} = useTranslation();

 const d=value.dto;
 const grossAvailable=d.calculation?.grossPay!==null && d.calculation?.grossPay!==undefined;
 const subtotalAvailable=d.calculation?.calculatedSubtotal!==null && d.calculation?.calculatedSubtotal!==undefined;
 const hasAmount=grossAvailable||subtotalAvailable;
 const freshness=d.freshness.overall;
 const cached=value.title===translate("results.resultPresentation_previous_result_current_confirm");
 return <section data-result-summary className={styles.summary} aria-label={translate("results.resultPresentation_wage_result")}>
 <div className={styles.summaryTop}><h2 className={styles.summaryTitle}>{value.title}</h2><ReceiptText size={21} aria-hidden="true"/></div>
 <p role="status" className={styles.freshness} data-current={freshness==="CURRENT"&&!cached}>{cached?translate("results.resultPresentation_previous_result_current_confirm"):freshness==="CURRENT"?translate("results.resultPresentation_current_input_basis"):freshness==="UPDATING"?translate("results.resultPresentation_automatic_update_previous_input_basis_result"):freshness==="FAILED"?translate("results.resultPresentation_update_failure_previous_input_basis_result"):translate("results.resultPresentation_previous_input_basis_result")}</p>
 {!compare&&<>
 {!hasAmount&&<p className={styles.pendingAmount}>{translate("results.resultPresentation_calculation_information")}<br/>{translate("results.resultPresentation_required")}</p>}
 <dl className={styles.amounts}>
 <div className={hasAmount?styles.mainAmount:styles.secondaryAmount}>
 <dt>{grossAvailable?translate("results.resultPresentation_scope_gross_total"):translate("results.resultPresentation_calculation_minutes_subtotal_all_wage")}</dt>
 <dd>{displayScalar(grossAvailable?d.calculation?.grossPay:d.calculation?.calculatedSubtotal,grossAvailable?"grossPay":"calculatedSubtotal")}</dd>
 </div>
 <div className={styles.secondaryAmount}>
 <dt>{grossAvailable?translate("results.resultPresentation_calculation_minutes_subtotal_all_wage"):translate("results.resultPresentation_scope_gross_total")}</dt>
 <dd>{displayScalar(grossAvailable?d.calculation?.calculatedSubtotal:d.calculation?.grossPay,grossAvailable?"calculatedSubtotal":"grossPay")}</dd>
 </div>
 </dl>
 <div className={styles.scope}><Badge status={d.summary.calculationStatus}/><p>{d.summary.calculationStatus==="COMPLETE"?translate("results.resultPresentation_calculation_scope_provided_item"):d.summary.calculationStatus==="PARTIAL"?<>{translate("results.resultPresentation_minutes_calculation_all_wage")}<br/>{translate("results.resultPresentation_confirm_calculation_included")}</>:d.summary.calculationStatus===null?translate("results.resultPresentation_calculation_result_notProvided"):<>{translate("results.resultPresentation_calculation_required_record")}<br/>{translate("results.resultPresentation_confirm")}</>}</p></div>
 </>}
 {compare&&<><p className={styles.comparisonTitle}>{translate("results.resultPresentation_record_difference")}<br/>{translate("results.resultPresentation_confirm_content")}</p><Badge status={d.summary.comparisonStatus}/><p className={styles.scopeCopy}>{translate("results.resultPresentation_contract_attendance_payslip_comparison_sum_confirm_match", { value1: d.summary.counts.match ?? translate("common.notProvided") })}</p></>}
 </section>;
}
export function ResultNextSteps({value,caseId}:{value:Model;caseId:number}) {
 const {translate} = useTranslation();

 const d=value.dto;
 const needsInput=d.summary.counts.insufficientInformation===null || d.summary.counts.reviewRequired===null || d.summary.counts.insufficientInformation>0 || d.summary.counts.reviewRequired>0 || d.summary.calculationStatus!=="COMPLETE";
 return <aside className={styles.nextSteps} aria-label={translate("results.resultPresentation_result_confirm_next")}>
 <span className={styles.nextIcon} aria-hidden="true">{needsInput?<FileCheck2 size={23}/>:<MessageSquareText size={23}/>}</span>
 <p className={styles.eyebrow}>{translate("results.resultPresentation_next")}</p>
 <h2>{needsInput?<><span>{translate("results.resultPresentation_confirm_content_2")}</span>{" "}<span>{translate("results.resultPresentation_h22")}</span></>:<><span>{translate("results.resultPresentation_result_confirm")}</span>{" "}<span>{translate("results.resultPresentation_question")}</span></>}</h2>
 <p>{needsInput?translate("results.resultPresentation_original_calculation_confirm_scope_count"):translate("results.resultPresentation_difference_company_content_count")}</p>
 <Link className={styles.primaryAction} href={`/cases/${caseId}/${needsInput?"conditions":"questions"}`}>{needsInput?translate("results.resultPresentation_calculation_confirm"):translate("results.resultDetail_confirm_question")}<ArrowRight size={18} aria-hidden="true"/></Link>
 <Link className={styles.textAction} href={`/cases/${caseId}/${needsInput?"review":"company-inquiry"}`}>{needsInput?translate("results.resultPresentation_original_extractedValue_confirm"):translate("results.resultPresentation_company_inquiry_draft")}<ArrowRight size={16} aria-hidden="true"/></Link>
 </aside>;
}
export function ResultChecks({value,caseId}:{value:Model;caseId:number}) {
const {displayScalar} = useLocalized(createLocalizedFeaturesResultsViewModels);

 const {translate} = useTranslation();

 const d=value.dto;
 return <section className="space-y-4"><h2 className="text-xl font-bold">{translate("results.resultPresentation_check_result")}</h2>
 <article className={`${cardStyle} border-l-[5px] border-l-primary`}><h3 className="font-bold">{translate("results.resultExplorer_contract_attendance_payslip_comparison")}</h3><Badge status={d.comparison?.status ?? d.summary.comparisonStatus}/>{d.comparison?.items.map((item,i)=><div key={i} className="my-4 space-y-3"><Badge status={item.status}/><dl className="grid gap-3 md:grid-cols-2">{(["contractValue","attendanceValue","payslipValue","difference"] as const).filter(k=>k in item).map(k=><div key={k}><dt>{{contractValue:translate("results.resultPresentation_contract"),attendanceValue:translate("results.resultPresentation_attendance"),payslipValue:translate("results.resultPresentation_payslip"),difference:translate("results.resultComparisonTable_difference")}[k]}</dt><dd className="text-xl font-bold">{displayScalar(item[k],k,item.comparisonBasis?.unit)}</dd></div>)}</dl><details><summary>{translate("results.resultPresentation_comparison_scope_review")}</summary><ServerValue caseId={caseId} value={item}/></details></div>)}</article>
 <h3 className="font-bold">{translate("results.resultPresentation_payslip_sum_check")}</h3><div className="grid gap-4 xl:grid-cols-3">{(["paymentTotal","deductionTotal","netPay"] as const).map(key=>{const check=d.payslipValidation?.[key];return <article key={key} className={`${cardStyle} border-l-[5px] border-l-primary space-y-3`}><h4 className="font-bold">{{paymentTotal:translate("results.resultExplorer_payment_sum"),deductionTotal:translate("results.resultExplorer_deduction_sum"),netPay:translate("results.resultExplorer_netPay")}[key]}</h4><Badge status={check?.status}/><dl>{check&&(["itemSum","statedTotal","calculated","stated","difference"] as const).filter(k=>k in check).map(k=><div key={k}><dt>{{itemSum:translate("results.resultComparisonTable_sum"),statedTotal:translate("results.resultPresentation_payslip_total"),calculated:translate("results.resultDetail_calculation"),stated:translate("results.resultPresentation_payslip_2"),difference:translate("results.resultComparisonTable_difference")}[k]}</dt><dd className="font-bold">{displayScalar(check[k],k,"KRW")}</dd></div>)}</dl>{!check&&<p>{translate("results.resultPresentation_check_result_none")}</p>}</article>})}</div></section>;
}
export function ResultItem({item,caseId}:{item:Model["items"][number];caseId:number}) {
 const {translate} = useTranslation();

 return <article className={`${cardStyle} border-l-[5px] ${item.status==="MATCH"?"border-l-success":"border-l-warning"} space-y-4`}><h3 className="text-xl font-bold">{item.title}</h3><Badge status={item.status}/><p>{translate("results.resultPresentation_wagePeriod_unit", { value1: item.dto.periodStart ?? translate("common.notProvided"), value2: item.dto.periodEnd ?? translate("common.notProvided"), value3: item.dto.unit ?? translate("common.notProvided") })}</p><dl className="grid min-w-0 gap-3 md:grid-cols-3">{item.values.map(v=><div key={v.key} className="min-w-0 rounded-control bg-neutral-soft p-4"><dt>{v.label}</dt><dd className="mt-2 text-2xl font-bold">{v.text}</dd></div>)}</dl>{item.dto.nextAction&&<p>{item.dto.nextAction}</p>}<details><summary className="font-bold">{translate("results.resultPresentation_evidence_calculation_review_expand")}</summary><ServerValue caseId={caseId} value={item.dto}/></details></article>;
}
