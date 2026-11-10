import { z } from "zod";
import { freshnessSchema,resultStatusSchema } from "@/features/results/schemas";
const amount=z.number().int().safe().nullable();
// P0 core amounts; metadata is optional because P0 does not fully define snapshot DTOs.
export const depositComparisonSchema=z.object({depositComparisonId:z.number().int(),version:z.number().int(),payslipNetPay:amount,linkedBankDepositTotal:amount,linkedCashPaymentTotal:amount,linkedPaymentTotal:amount,difference:amount,status:resultStatusSchema,basedOnInputVersion:z.number().int().optional(),createdAt:z.iso.datetime({offset:true}).optional(),freshness:freshnessSchema.optional()}).passthrough();
// P4 B-69 shape is supported, not promoted to the complete P0 contract.
export const duplicateSchema=z.object({items:z.array(z.object({transactionId:z.number().int(),matchReasons:z.array(z.string()).optional()}).passthrough())}).passthrough();
export type DepositComparison= z.infer<typeof depositComparisonSchema>;
