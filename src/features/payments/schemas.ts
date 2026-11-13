import { z } from "zod";
export const money = z.number().int().safe().nonnegative();
export const requestMoney = z.number().int().min(0).max(1_000_000_000_000);
const method = z.enum(["BANK_TRANSFER", "CASH"]);
const confirmation = z.enum(["USER_REPORTED", "USER_CONFIRMED"]);
const sender = z.string().max(200).nullable().optional();
const memo = z.string().max(1000).nullable().optional();
const bankReference = z.string().min(1).max(200).nullable().optional();
export const transactionCreate = z.strictObject({
 paymentMethod:method, transactionDate:z.iso.date(), amount:requestMoney, sender, memo,
 source:z.enum(["USER_INPUT","DOCUMENT"]).optional(), confirmationStatus:confirmation.optional(),
 sourceDocumentId:z.number().int().positive().nullable().optional(),
 sourceCandidateId:z.string().min(1).max(100).nullable().optional(),
 sourceRowId:z.string().min(1).max(100).nullable().optional(), bankReference,
});
export const transactionPatch = z.strictObject({
 paymentMethod:method.nullable().optional(), transactionDate:z.iso.date().nullable().optional(),
 amount:requestMoney.nullable().optional(), sender, memo,
 confirmationStatus:confirmation.nullable().optional(), bankReference,
});
const expectedInputVersion = z.number().int().min(1).nullable().optional();
export const allocationCreate = z.strictObject({transactionId:z.number().int().positive(),allocatedAmount:requestMoney,expectedInputVersion});
export const allocationPatch = z.strictObject({allocatedAmount:requestMoney,expectedInputVersion});
export type TransactionCreate = z.infer<typeof transactionCreate>;
export type TransactionPatch = z.infer<typeof transactionPatch>;
export type AllocationCreate = z.infer<typeof allocationCreate>;
export type AllocationPatch = z.infer<typeof allocationPatch>;
export const transaction = transactionCreate.omit({source:true,confirmationStatus:true,sender:true,memo:true}).extend({amount:money,sender:z.string().nullable().optional(),memo:z.string().nullable().optional(),transactionId:z.number().int(),source:z.string(),confirmationStatus:z.string(),totalAllocatedAcrossCases:money,remainingUnallocated:money}).passthrough();
export const allocation = z.object({allocationId:z.number().int(),caseId:z.number().int(),transactionId:z.number().int(),allocatedAmount:money,transactionAmount:money,totalAllocatedAcrossCases:money,remainingUnallocated:money}).passthrough();
export type Transaction = z.infer<typeof transaction>;

// The backend Envelope is untyped for this route. Fields verified against
// app/routers/payments.py:deposit_candidates (local BE source).
export const depositCandidate = z.object({
 registration: transactionCreate.extend({transactionDate:z.string().nullable(),amount:z.union([z.number(),z.string()]).nullable()}),
 registerable:z.boolean(), reasonCode:z.string().nullable(), existingTransactionId:z.number().int().positive().nullable(),
 requiresUserConfirmation:z.boolean(),requiresCaseAllocation:z.boolean(),
});
export const depositCandidates = z.object({items:z.array(depositCandidate)});
export type DepositCandidate = z.infer<typeof depositCandidate>;
