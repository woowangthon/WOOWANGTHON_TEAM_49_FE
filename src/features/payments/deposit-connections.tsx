"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCase } from "@/features/cases/queries";
import { useTranslation } from "@/i18n/use-translation";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { PaymentScreen } from "./payment-screen";
import { useDepositCandidates, usePayments } from "./queries";
import { transactionCreate, type DepositCandidate, type Transaction } from "./schemas";
import { ApiError } from "@/lib/api/error";

export function DepositConnections({caseId}:{caseId:number}) {
 const context=useCase(caseId);
 const [open,setOpen]=useState(false);
 const {translate}=useTranslation();
 useEffect(()=>{const show=()=>{if(window.location.hash==="#deposit-connections")setOpen(true);};show();window.addEventListener("hashchange",show);return()=>window.removeEventListener("hashchange",show);},[]);
 return <details id="deposit-connections" open={open} onToggle={e=>setOpen(e.currentTarget.open)} className="mt-6 min-w-0 rounded-2xl border border-line p-4 [overflow-wrap:anywhere]">
  <summary className="min-h-11 cursor-pointer font-bold">{translate("payments.connections")}</summary>
  <p className="my-3">{translate("payments.optionalConnections")}</p>
  {open&&(context.data?<PaymentScreen workplaceId={context.data.workplaceId} caseId={caseId} inputVersion={context.data.inputVersion}/>:<QueryFeedback pending={context.isPending} error={context.error} retry={()=>void context.refetch()}/>)}
 </details>;
}

export function DepositCandidates({workplaceId,caseId,onSelect}:{workplaceId:number;caseId?:number;onSelect:(t:Transaction)=>void}) {
 const [open,setOpen]=useState(false);
 const query=useDepositCandidates(workplaceId,open);
 const {api,action}=usePayments(workplaceId,1,caseId);
 const [registered,setRegistered]=useState<Record<string,number>>({});
 const {translate}=useTranslation();
 function key(c:DepositCandidate){return `${c.registration.sourceDocumentId}:${c.registration.sourceCandidateId}:${c.registration.sourceRowId}`;}
 return <section className="space-y-3">
  <button type="button" className={secondaryButton} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{translate("payments.importCandidates")}</button>
  {open&&<>{(query.isPending||query.isError)&&<QueryFeedback pending={query.isPending} error={query.error} retry={()=>void query.refetch()}/>}
  {query.data?.items.length===0&&<p>{translate("payments.noCandidates")}</p>}
  {query.data?.items.map((c,i)=>{const body=transactionCreate.safeParse({...c.registration,amount:typeof c.registration.amount==="string"&&/^\d+$/.test(c.registration.amount)?Number(c.registration.amount):c.registration.amount});const id=registered[key(c)]??c.existingTransactionId;const provenance=!!c.registration.sourceDocumentId&&!!c.registration.sourceCandidateId&&!!c.registration.sourceRowId;
   return <article key={`${key(c)}:${i}`} className="space-y-2 rounded-xl border border-line p-3">
    <p>{c.registration.transactionDate??translate("common.notProvided")} · {c.registration.amount??translate("common.notProvided")}</p>
    {c.registration.sourceDocumentId&&<Link href={caseId?`/cases/${caseId}/review?documentId=${c.registration.sourceDocumentId}`:`/workplaces/${workplaceId}/documents`}>{translate("payments.sourceDocument",{id:c.registration.sourceDocumentId})}</Link>}
    {!id&&(!c.registerable||!body.success||!provenance)&&<p>{translate("payments.unavailableCandidate")}</p>}
    <button type="button" className={secondaryButton} disabled={action.isPending||(!id&&(!c.registerable||!body.success||!provenance))} onClick={()=>action.mutate(async()=>{
     let t:Transaction;
     if(id)t=await api.detail(workplaceId,id);
     else {
      if(!c.registerable||!body.success||!provenance)return;
      try {t=await api.create(workplaceId,{...body.data,confirmationStatus:"USER_REPORTED"});}
      catch(error){if(error instanceof ApiError&&error.errorCode==="DUPLICATE_TRANSACTION"&&typeof error.details?.existingTransactionId==="number")t=await api.detail(workplaceId,error.details.existingTransactionId);else throw error;}
     }
     if(t.source!=="DOCUMENT" || (body.success&&(t.amount!==body.data.amount||t.transactionDate!==body.data.transactionDate||t.paymentMethod!==body.data.paymentMethod)))throw new ApiError(409,{errorCode:"TRANSACTION_SOURCE_RECONFIRMATION_REQUIRED"});
     setRegistered(v=>({...v,[key(c)]:t.transactionId}));onSelect(t);return t;
    })}>{id?translate("payments.reuseCandidate"):translate("payments.registerCandidate")}</button>
   </article>;
  })}
  {action.isSuccess&&<p role="status">{translate("payments.candidateRegistered")}</p>}
  {action.isError&&<QueryFeedback error={action.error}/>}</>}
 </section>;
}
