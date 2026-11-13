import { ApiError } from "@/lib/api/error";
import type { paymentsApi } from "./api";
import type { Transaction, TransactionCreate } from "./schemas";

// Retain each successful step even when a later request fails.
export async function connectPayment({api,workplaceId,caseId,body,transactionId,remember,confirm,currentVersion}:{
 api:ReturnType<typeof paymentsApi>; workplaceId:number; caseId:number;
 body?:TransactionCreate; transactionId?:number; remember:(t:Transaction)=>void;
 confirm:(t:Transaction)=>boolean; currentVersion:()=>Promise<number>;
}) {
 let t:Transaction;
 if(transactionId)t=await api.detail(workplaceId,transactionId);
 else {
  if(!body)throw new Error("Missing transaction input");
  try {t=await api.create(workplaceId,{...body,confirmationStatus:"USER_REPORTED"});}
  catch(error){
   if(!(error instanceof ApiError)||error.errorCode!=="DUPLICATE_TRANSACTION"||typeof error.details?.existingTransactionId!=="number")throw error;
   t=await api.detail(workplaceId,error.details.existingTransactionId);
   if(t.amount!==body.amount||t.transactionDate!==body.transactionDate||t.paymentMethod!==body.paymentMethod)throw error;
  }
 }
 remember(t);
 if(body?.source==="DOCUMENT"&&(t.source!=="DOCUMENT"||t.amount!==body.amount||t.transactionDate!==body.transactionDate||t.paymentMethod!==body.paymentMethod))throw new ApiError(409,{errorCode:"TRANSACTION_SOURCE_RECONFIRMATION_REQUIRED"});
 const links=await api.allocations(caseId);
 const connected=links.items.some(a=>a.transactionId===t.transactionId);
 // Explicit approval includes the server balance, including shared transactions.
 if(!confirm(t))return;
 const approvedBalance=t.remainingUnallocated;
 if(t.confirmationStatus!=="USER_CONFIRMED"){
  t=await api.update(workplaceId,t.transactionId,{confirmationStatus:"USER_CONFIRMED"});
  remember(t);
  if(t.confirmationStatus!=="USER_CONFIRMED")throw new ApiError(409,{errorCode:"TRANSACTION_SOURCE_RECONFIRMATION_REQUIRED"});
 }
 if(connected)return t;
 const latest=await api.detail(workplaceId,t.transactionId);
 if(latest.remainingUnallocated!==approvedBalance)throw new ApiError(409,{errorCode:"ALLOCATION_EXCEEDS_TRANSACTION"});
 if((await api.allocations(caseId)).items.some(a=>a.transactionId===t.transactionId))return latest;
 if(latest.remainingUnallocated<0||(latest.remainingUnallocated===0&&latest.amount!==0))throw new ApiError(409,{errorCode:"ALLOCATION_EXCEEDS_TRANSACTION"});
 return api.allocate(caseId,{transactionId:t.transactionId,allocatedAmount:latest.remainingUnallocated,expectedInputVersion:await currentVersion()});
}
