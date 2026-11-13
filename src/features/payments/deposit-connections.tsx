"use client";
import { useState } from "react";
import Link from "next/link";
import { useCase } from "@/features/cases/queries";
import { useTranslation, useLocalized } from "@/i18n/use-translation";
import { createLocalizedLibApiFormErrors } from "@/lib/api/form-errors";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { CaseDeposits } from "./case-deposits";
import { useDepositCandidates, usePayments } from "./queries";
import { transactionCreate, type DepositCandidate, type Transaction } from "./schemas";
import { ApiError } from "@/lib/api/error";

export function DepositConnections({caseId}:{caseId:number}) {
 const context=useCase(caseId);
 return context.data?<CaseDeposits workplaceId={context.data.workplaceId} caseId={caseId}/>:<QueryFeedback pending={context.isPending} error={context.error} retry={()=>void context.refetch()}/>;
}

export function DepositCandidates({workplaceId,caseId,onSelect,inputVersion}:{workplaceId:number;caseId?:number;inputVersion?:number;onSelect:(t:Transaction)=>void}) {
 const [open,setOpen]=useState(false);
 const query=useDepositCandidates(workplaceId,open);
 const {api,action}=usePayments(workplaceId,1,caseId);
 const [selected,setSelected]=useState<Transaction>();
 const [connected,setConnected]=useState(false);
 const context=useCase(caseId??0);
 const [registered,setRegistered]=useState<Record<string,number>>({});
 const {translate,locale}=useTranslation();
 const {businessErrorMessage}=useLocalized(createLocalizedLibApiFormErrors);
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
     setRegistered(v=>({...v,[key(c)]:t.transactionId}));setSelected(t);setConnected(caseId? (await api.allocations(caseId)).items.some(a=>a.transactionId===t.transactionId):false);onSelect(t);return t;
    })}>{id?translate("payments.reuseCandidate"):translate("payments.registerCandidate")}</button>
   </article>;
  })}
  {selected&&caseId&&inputVersion!==undefined&&<div className="space-y-3">
   <p role="status">{translate(selected.confirmationStatus==="USER_CONFIRMED"?"payments.confirmed":"payments.registered")}</p>
   {connected?<p role="status">{translate("payments.connected")}</p>:<>
    <p>{translate("payments.autoAmount",{amount:selected.remainingUnallocated.toLocaleString(locale)})}</p>
    <button type="button" className={secondaryButton} disabled={action.isPending||selected.remainingUnallocated<=0} onClick={()=>action.mutate(async()=>{
     let current=await api.detail(workplaceId,selected.transactionId);
     setSelected(current);onSelect(current);
     const links=await api.allocations(caseId);
     if(links.items.some(a=>a.transactionId===current.transactionId)){setConnected(true);return;}
     // A changed balance must be displayed and explicitly approved again.
     if(current.remainingUnallocated!==selected.remainingUnallocated)return;
     if(current.remainingUnallocated<=0)return;
     if(current.confirmationStatus!=="USER_CONFIRMED"){
      current=await api.update(workplaceId,current.transactionId,{confirmationStatus:"USER_CONFIRMED"});
      setSelected(current);onSelect(current);
      if(current.remainingUnallocated!==selected.remainingUnallocated||current.remainingUnallocated<=0)return;
     }
     try {
      const result=await api.allocate(caseId,{transactionId:current.transactionId,allocatedAmount:current.remainingUnallocated,expectedInputVersion:context.data?.inputVersion??inputVersion});
      setConnected(true);return result;
     } catch(error){
      const latest=await api.detail(workplaceId,current.transactionId);setSelected(latest);onSelect(latest);
      const links=await api.allocations(caseId);
      if(links.items.some(a=>a.transactionId===current.transactionId))setConnected(true);
      throw error;
     }
    })}>{translate("payments.confirmAndConnect")}</button>
   </>}
  </div>}
  {action.isSuccess&&!selected&&<p role="status">{translate("payments.candidateRegistered")}</p>}
  {action.isError&&<div role="alert"><p>{translate("payments.connectionFailed")}</p><p>{businessErrorMessage(action.error)}</p></div>}</>}
 </section>;
}
