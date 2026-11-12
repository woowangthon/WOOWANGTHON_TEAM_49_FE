import { z } from "zod";
import { freshnessSchema,resultStatusSchema } from "@/features/results/schemas";
const amount=z.number().int().safe().nullable();
// P0 core amounts; metadata is optional because P0 does not fully define snapshot DTOs.
export const depositComparisonSchema=z.object({depositComparisonId:z.number().int(),version:z.number().int(),payslipNetPay:amount,linkedBankDepositTotal:amount,linkedCashPaymentTotal:amount,linkedPaymentTotal:amount,difference:amount,status:resultStatusSchema,basedOnInputVersion:z.number().int().optional(),createdAt:z.iso.datetime({offset:true}).optional(),freshness:freshnessSchema.optional()}).passthrough();
// P0 API_REFERENCE API-073 / DuplicatePair.
export const duplicateSchema=z.object({candidates:z.array(z.object({transactionIds:z.array(z.number().int()),reason:z.string()}))});
export type DepositComparison= z.infer<typeof depositComparisonSchema>;
