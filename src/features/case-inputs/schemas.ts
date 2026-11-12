import { z } from "zod";
import { updateMetaSchema } from "@/features/documents/review/schemas";

const id = z.number().int().positive();
export const recordTypes = ["CONTRACT", "ATTENDANCE", "PAYSLIP", "DEPOSIT"] as const;
export const recordTypeSchema = z.enum(recordTypes);
export const manualRecordSchema = z.object({
  recordId: id, caseId: id, recordType: recordTypeSchema,
  data: z.record(z.string(), z.json()), source: z.literal("USER_INPUT"),
  createdAt: z.iso.datetime({ offset: true }).optional(), updatedAt: z.iso.datetime({ offset: true }).optional(),
});
export const manualSavedSchema = z.union([
  updateMetaSchema.extend({ recordId: z.null(), canonicalResource: z.literal("PAYMENT_TRANSACTION"), transactionId: id, allocationId: id }),
  updateMetaSchema.extend({ recordId: id }),
]);
export const conditionIds = ["workplace_size", "regular_minutes", "base_scope_confirmed", "comparison_basis_confirmed", "hours_basis_confirmed", "base_pay_basis_confirmed"] as const;
export const conditionSchema = z.object({
  conditionId: z.string(), question: z.string(), type: z.enum(["SELECT", "NUMBER", "TEXT", "BOOLEAN"]),
  options: z.array(z.string()).nullable(), requiredFor: z.array(z.string()),
  value: z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
  status: z.enum(["REQUIRED", "ANSWERED", "UNKNOWN", "NOT_APPLICABLE"]), source: z.string().nullable(),
});
export const conditionsSchema = z.object({ conditions: z.array(conditionSchema), inputVersion: id });
export const conditionAnswerSchema = z.object({
  conditionId: z.enum(conditionIds), value: z.union([z.string(), z.number(), z.boolean()]),
}).superRefine((v, ctx) => {
  const valid = v.value === "UNKNOWN" || (v.conditionId === "workplace_size"
    ? ["LESS_THAN_5", "AT_LEAST_5"].includes(String(v.value)) && typeof v.value === "string"
    : v.conditionId === "regular_minutes" ? typeof v.value === "number" && Number.isSafeInteger(v.value) && v.value >= 0 && v.value <= 1_000_000
      : typeof v.value === "boolean");
  if (!valid) ctx.addIssue({ code: "custom", path: ["value"], message: "P0에서 허용한 응답 형식과 범위를 확인해 주세요." });
});
export const conditionsPutSchema = z.object({ answers: z.array(conditionAnswerSchema), expectedInputVersion: id });
export const checkTypes = ["WAGE_CALCULATION", "CONTRACT_ATTENDANCE_COMPARISON", "PAYSLIP_VALIDATION", "DEPOSIT_COMPARISON"] as const;
export const checkSchema = z.object({ checkType: z.enum(checkTypes), available: z.boolean(), mode: z.enum(["FULL", "PARTIAL", "NONE"]), missingInputs: z.array(z.string()), reasonCode: z.string().nullable().optional() });
export const readinessSchema = z.object({ caseId: id, inputVersion: id, checks: z.array(checkSchema) });
export type ManualRecord = z.infer<typeof manualRecordSchema>;
export type ManualSaved = z.infer<typeof manualSavedSchema>;
export type RecordType = z.infer<typeof recordTypeSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Conditions = z.infer<typeof conditionsSchema>;
export type ConditionsPut = z.infer<typeof conditionsPutSchema>;
export type Readiness = z.infer<typeof readinessSchema>;
export interface ManualInput { recordType: RecordType; data: ManualRecord["data"]; source: "USER_INPUT" }

const money = z.number().int().safe();
const optionalMoney = money.nullable().optional();
const minutes = z.number().int().safe().nonnegative();
// P0 does not publish wage amount bounds beyond integer KRW; no invented maximum.
export const manualInputSchema = z.discriminatedUnion("recordType", [
  z.object({ recordType: z.literal("CONTRACT"), source: z.literal("USER_INPUT"), data: z.object({ hourlyWage: optionalMoney, monthlyBasePay: optionalMoney }).catchall(z.json()) }),
  z.object({ recordType: z.literal("PAYSLIP"), source: z.literal("USER_INPUT"), data: z.object({ grossPay: optionalMoney, totalDeductions: optionalMoney, netPay: optionalMoney, hourlyWage: optionalMoney, basePay: optionalMoney, workedMinutes: minutes.nullable().optional(), paymentItems: z.array(money).nullable().optional(), deductionItems: z.array(money).nullable().optional() }).catchall(z.json()) }),
  z.object({ recordType: z.literal("ATTENDANCE"), source: z.literal("USER_INPUT"), data: z.object({ workDate: z.iso.date(), clockIn: z.iso.datetime({ offset: true }), clockOut: z.iso.datetime({ offset: true }), breakMinutes: minutes }).catchall(z.json()) }),
  z.object({ recordType: z.literal("DEPOSIT"), source: z.literal("USER_INPUT"), data: z.object({ paymentMethod: z.enum(["BANK_TRANSFER", "CASH"]), transactionDate: z.iso.date(), amount: money.nonnegative(), sender: z.string().nullable().optional(), memo: z.string().nullable().optional(), source: z.literal("USER_INPUT"), confirmationStatus: z.literal("USER_REPORTED").optional() }).catchall(z.json()) }),
]);
