"use client";

import { useEffect, useRef, useState } from "react";
import { Minus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@/i18n/use-localized-form";
import { useTranslation } from "@/i18n/use-translation";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useDocuments, useRecomputeStatus } from "@/features/documents/queries";
import { caseApi } from "@/features/cases/api";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { useDepositCandidates, usePayments } from "./queries";
import { transactionCreate, type TransactionCreate, type Transaction, type DepositCandidate } from "./schemas";
import { connectPayment } from "./connect-payment";
import styles from "@/features/case-inputs/components/conditions-screen.module.css";

const candidateKey=(c:DepositCandidate)=>`${c.registration.sourceDocumentId}:${c.registration.sourceCandidateId}:${c.registration.sourceRowId}`;
const parseCandidate=(c:DepositCandidate)=>transactionCreate.safeParse({...c.registration,amount:typeof c.registration.amount==="string"&&/^\d+$/.test(c.registration.amount)?Number(c.registration.amount):c.registration.amount});

export function CaseDeposits({workplaceId,caseId}:{workplaceId:number;caseId:number}) {
 const {translate:t,locale}=useTranslation();
 const scope=useSessionScope();
 const [editing,setEditing]=useState(false);
 const [selection,setSelection]=useState("");
 const registered=useRef<Record<string,number>>({});
 const {api,transactions,allocations,linked,action}=usePayments(workplaceId,1,caseId);
 const candidates=useDepositCandidates(workplaceId,editing);
 const documents=useDocuments({kind:"workplace",id:workplaceId},{page:1,size:100,documentType:"DEPOSIT"},editing);
 const recompute=useRecomputeStatus(caseId);
 useEffect(()=>{const show=()=>{if(window.location.hash==="#deposit-connections")setEditing(true);};show();window.addEventListener("hashchange",show);return()=>window.removeEventListener("hashchange",show);},[]);
 const form=useForm<TransactionCreate>({resolver:zodResolver(transactionCreate),mode:"onChange",defaultValues:{paymentMethod:"BANK_TRANSFER",transactionDate:"",source:"USER_INPUT",confirmationStatus:"USER_REPORTED",sender:"",memo:""}});
 const money=(n:number)=>new Intl.NumberFormat(locale,{style:"currency",currency:"KRW",maximumFractionDigits:0}).format(n);
 const rows=allocations.data?.items??[];
 const all=[...(transactions.data?.items??[]),...linked.flatMap(q=>q.data?[q.data]:[])];
 const find=(id:number)=>all.find(t=>t.transactionId===id);
 const ready=allocations.isSuccess&&transactions.isSuccess&&linked.every(q=>q.isSuccess);
 const confirmed=rows.filter(a=>find(a.transactionId)?.confirmationStatus==="USER_CONFIRMED");
 const pending=rows.filter(a=>find(a.transactionId)?.confirmationStatus!=="USER_CONFIRMED");
 const total=(items:typeof rows)=>items.reduce((sum,a)=>sum+a.allocatedAmount,0);
 const candidate=candidates.data?.items.find(c=>candidateKey(c)===selection);
 const parsed=candidate?parseCandidate(candidate):undefined;
 const validCandidate=!!candidate&&(!!candidate.existingTransactionId||(candidate.registerable&&!!parsed?.success&&!!candidate.registration.sourceDocumentId&&!!candidate.registration.sourceCandidateId&&!!candidate.registration.sourceRowId));
 const currentVersion=async()=>(await caseApi(scope.api).detail(caseId)).inputVersion;
 const approval=(tx:Transaction)=>window.confirm([
  t("payments.confirmTransaction"),
  `${t("payments.paymentScreen_transaction")}: ${tx.transactionDate}`,
  `${t("payments.paymentScreen_amount")}: ${money(tx.amount)}`,
  `${t("payments.paymentScreen_deposit")}: ${tx.sender||t("common.notProvided")}`,
  tx.source==="DOCUMENT"?documents.data?.items.find(d=>d.documentId===candidate?.registration.sourceDocumentId)?.fileName??t("payments.documentFallback"):t("payments.manualInput"),
  t("payments.autoAmount",{amount:tx.remainingUnallocated.toLocaleString(locale)}),
 ].join("\n"));
 const add=(body?:TransactionCreate)=>action.mutate(async()=>{
  const result=await connectPayment({api,workplaceId,caseId,body,transactionId:registered.current[selection]??candidate?.existingTransactionId??undefined,remember:tx=>{registered.current[selection]=tx.transactionId;},confirm:approval,currentVersion});
  if(result){setSelection("");form.reset();}
  return result;
 });
 return <section id="deposit-connections" className={styles.depositStep} aria-label={t("payments.amountQuestion")} aria-busy={action.isPending}>
  {!editing?<>
   <p className={styles.answerTitle}>{t("payments.amountQuestion")}</p>
   <div className={styles.depositSummary}>
    <div aria-live="polite">{ready&&<><p className={styles.answerValue}>{!rows.length?t("payments.notEntered"):confirmed.length?money(total(confirmed)):t("payments.needsConfirmation")}</p>{!!pending.length&&<p className={styles.hint}>{t("payments.pendingAmount",{amount:money(total(pending))})}</p>}<p className={styles.hint}>{t("payments.linkedCount",{count:rows.length})}</p></>}</div>
    <button type="button" className={styles.textButton} onClick={()=>setEditing(true)}>{t("common.edit")}</button>
   </div>
  </>:<>
   <div className="flex flex-wrap items-center justify-between gap-3"><h2 className={styles.depositTitle}>{t("payments.editQuestion")}</h2><button type="button" className={styles.textButton} disabled={action.isPending} onClick={()=>setEditing(false)}>{t("payments.finishEditing")}</button></div>
   <p className={styles.hint}>{t("payments.optionalConnections")}</p>
   <label className="block min-w-0">{t("payments.selectSource")}<select className="ui-control w-full min-w-0 max-w-full" value={selection} disabled={action.isPending} onChange={e=>{setSelection(e.target.value);action.reset();}}>
    <option value="">{t("payments.selectSource")}</option>
    {candidates.data?.items.map(c=>{
     const body=parseCandidate(c);
     const unavailable=!c.existingTransactionId&&(!c.registerable||!body.success||!c.registration.sourceDocumentId||!c.registration.sourceCandidateId||!c.registration.sourceRowId);
     const name=documents.data?.items.find(d=>d.documentId===c.registration.sourceDocumentId)?.fileName??t("payments.documentFallback");
     return <option key={candidateKey(c)} value={candidateKey(c)} disabled={unavailable}>{name} · {t("payments.depositField")} · {body.success?money(body.data.amount):t("common.notProvided")}{unavailable?` · ${t("payments.unavailableCandidate")}`:""}</option>;
    })}
    <option value="manual">{t("payments.manualInput")}</option>
   </select></label>
   {editing&&(candidates.isPending||candidates.isError)&&<QueryFeedback pending={candidates.isPending} error={candidates.error} retry={()=>void candidates.refetch()}/>}
   {candidates.isSuccess&&!candidates.data.items.length&&<p className={styles.hint}>{t("payments.noCandidates")}</p>}
   {selection==="manual"&&<form id={`deposit-form-${caseId}`} noValidate onSubmit={event=>{void form.handleSubmit(value=>add(value))(event);}} onChange={()=>{delete registered.current.manual;}}>
    <fieldset disabled={action.isPending} className="grid min-w-0 gap-3 sm:grid-cols-2">
     <label>{t("payments.paymentScreen_payment_count")}<select className="ui-control" {...form.register("paymentMethod")}><option value="BANK_TRANSFER">{t("payments.paymentScreen_bankAccount_deposit")}</option><option value="CASH">{t("payments.paymentScreen_cash_payment")}</option></select></label>
     <label>{t("payments.paymentScreen_transaction")}<input className="ui-control" type="date" required aria-invalid={!!form.formState.errors.transactionDate} aria-describedby={form.formState.errors.transactionDate?`deposit-${caseId}-transactionDate-error`:undefined} {...form.register("transactionDate")}/></label>
     <label>{t("payments.paymentScreen_amount")}<input className="ui-control" type="number" required aria-invalid={!!form.formState.errors.amount} aria-describedby={form.formState.errors.amount?`deposit-${caseId}-amount-error`:undefined} min="0" max="1000000000000" step="1" {...form.register("amount",{valueAsNumber:true})}/></label>
     <label>{t("payments.paymentScreen_deposit")}<input className="ui-control" maxLength={200} {...form.register("sender")}/></label>
     <label>{t("payments.paymentScreen_label5")}<input className="ui-control" maxLength={1000} {...form.register("memo")}/></label>
    </fieldset>
    {Object.entries(form.formState.errors).map(([key,error])=><p key={key} id={`deposit-${caseId}-${key}-error`} role="alert">{error.message}</p>)}
   </form>}
   {(selection==="manual"?form.formState.isValid:selection!==""&&validCandidate)&&<div className="flex justify-end"><button type={selection==="manual"?"submit":"button"} form={selection==="manual"?`deposit-form-${caseId}`:undefined} className={styles.textButton} disabled={action.isPending||!ready} onClick={selection==="manual"?undefined:()=>add(parsed?.success?parsed.data:undefined)}>{t("payments.addDeposit")}</button></div>}
   <div className={styles.depositList} role="region" tabIndex={0} aria-label={t("payments.connections")}>
    {ready&&!rows.length&&<p>{t("payments.notEntered")}</p>}
    {rows.map(a=>{const tx=find(a.transactionId);return <article className={styles.depositItem} key={a.allocationId}>
     <div><p>{tx?.transactionDate??t("common.notProvided")} · {money(a.allocatedAmount)}</p><p className={styles.hint}>{tx?.sender||documents.data?.items.find(d=>d.documentId===tx?.sourceDocumentId)?.fileName||t(tx?.source==="USER_INPUT"?"payments.manualInput":"payments.documentFallback")}</p><p className={styles.hint}>{t(tx?.confirmationStatus==="USER_CONFIRMED"?"payments.confirmed":"payments.registered")}</p>
      {tx&&tx.confirmationStatus!=="USER_CONFIRMED"&&<button type="button" className={styles.textButton} disabled={action.isPending} onClick={()=>action.mutate(async()=>{const current=await api.detail(workplaceId,tx.transactionId);if(approval(current)){const updated=await api.update(workplaceId,tx.transactionId,{confirmationStatus:"USER_CONFIRMED"});if(updated.confirmationStatus!=="USER_CONFIRMED")throw new Error(t("payments.connectionFailed"));return updated;}})}>{t("payments.confirmDeposit")}</button>}
     </div>
     <button type="button" className={styles.textButton} aria-label={t("payments.removeDeposit")} disabled={action.isPending} onClick={()=>action.mutate(()=>api.release(caseId,a.allocationId))}><Minus size={20} aria-hidden="true"/></button>
    </article>;})}
   </div>
   {ready&&<p role="status">{t("payments.confirmedTotal",{amount:confirmed.length?money(total(confirmed)):t("payments.notEntered")})}{!!pending.length&&` · ${t("payments.pendingAmount",{amount:money(total(pending))})}`}</p>}
  </>}
  {[allocations,transactions,...linked].map((q,i)=>(q.isPending||q.isError)?<QueryFeedback key={i} pending={q.isPending} error={q.error} retry={()=>void q.refetch()}/>:null)}
  {action.isError&&<><p role="alert">{t("payments.connectionFailed")}</p><QueryFeedback error={action.error}/></>}
  {recompute.isError&&<QueryFeedback error={recompute.error} retry={()=>void recompute.refetch()}/>}
  {recompute.data?.latestJob?.status==="FAILED"&&<p role="status" className={styles.hint}>{t("payments.comparisonPanel_previous_result_update_failure_status")}</p>}
 </section>;
}
