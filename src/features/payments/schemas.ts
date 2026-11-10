import { z } from "zod";
export const money = z.number().int().safe().nonnegative();
export const transactionInput = z.object({paymentMethod:z.enum(["BANK_TRANSFER","CASH"]),transactionDate:z.iso.date(),amount:money,sender:z.string().optional(),memo:z.string().optional(),source:z.literal("USER_INPUT"),confirmationStatus:z.literal("USER_REPORTED")});
export const transaction = transactionInput.omit({source:true,confirmationStatus:true,sender:true,memo:true}).extend({sender:z.string().nullable().optional(),memo:z.string().nullable().optional(),transactionId:z.number().int(),source:z.string(),confirmationStatus:z.string(),totalAllocatedAcrossCases:money,remainingUnallocated:money}).passthrough();
export const allocation = z.object({allocationId:z.number().int(),caseId:z.number().int(),transactionId:z.number().int(),allocatedAmount:money,transactionAmount:money,totalAllocatedAcrossCases:money,remainingUnallocated:money}).passthrough();
export type Transaction = z.infer<typeof transaction>;
export type TransactionInput = z.infer<typeof transactionInput>;
