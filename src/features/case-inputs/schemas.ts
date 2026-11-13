
import {message as describeMessage} from '@/i18n/message';
import { z } from "zod";
import { updateMetaSchema } from "@/features/documents/review/schemas";
import {createTranslation, type Translation} from '@/i18n/translate';
import {defaultLocale} from '@/i18n/config';
export type ManualRecord = z.infer<typeof manualRecordSchema>;
export type ManualSaved = z.infer<typeof manualSavedSchema>;
export type RecordType = z.infer<typeof recordTypeSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Conditions = z.infer<typeof conditionsSchema>;
export type ConditionsPut = z.infer<typeof conditionsPutSchema>;
export type Readiness = z.infer<typeof readinessSchema>;
export interface ManualInput { recordType: RecordType; data: ManualRecord["data"]; source: "USER_INPUT" }

export function createLocalizedFeaturesCaseInputsSchemas(translation: Translation) {
  const {} = translation;
const id = z.number().int().positive();
const recordTypes = ["CONTRACT", "ATTENDANCE", "PAYSLIP", "DEPOSIT"] as const;
const recordTypeSchema = z.enum(recordTypes);
const manualRecordSchema = z.object({
  recordId: id, caseId: id, recordType: recordTypeSchema,
  data: z.record(z.string(), z.json()), source: z.literal("USER_INPUT"),
  createdAt: z.iso.datetime({ offset: true }).optional(), updatedAt: z.iso.datetime({ offset: true }).optional(),
});
const manualSavedSchema = z.union([
  updateMetaSchema.extend({ recordId: z.null(), canonicalResource: z.literal("PAYMENT_TRANSACTION"), transactionId: id, allocationId: id }),
  updateMetaSchema.extend({ recordId: id }),
]);
const conditionIds = ["workplace_size", "regular_minutes", "base_scope_confirmed", "comparison_basis_confirmed", "hours_basis_confirmed", "base_pay_basis_confirmed"] as const;
const conditionSchema = z.object({
  conditionId: z.string(), question: z.string(), type: z.enum(["SELECT", "NUMBER", "TEXT", "BOOLEAN"]),
  options: z.array(z.string()).nullable(), requiredFor: z.array(z.string()),
  value: z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
  status: z.enum(["REQUIRED", "ANSWERED", "UNKNOWN", "NOT_APPLICABLE"]), source: z.string().nullable(),
});
const conditionsSchema = z.object({ conditions: z.array(conditionSchema), inputVersion: id });
const conditionAnswerSchema = z.object({
  conditionId: z.enum(conditionIds), value: z.union([z.string(), z.number(), z.boolean()]),
}).superRefine((v, ctx) => {
  const valid = v.value === "UNKNOWN" || (v.conditionId === "workplace_size"
    ? ["LESS_THAN_5", "AT_LEAST_5"].includes(String(v.value)) && typeof v.value === "string"
    : v.conditionId === "regular_minutes" ? typeof v.value === "number" && Number.isSafeInteger(v.value) && v.value >= 0 && v.value <= 1_000_000
      : typeof v.value === "boolean");
  if (!valid) ctx.addIssue({ code: "custom", path: ["value"], message: describeMessage("caseInputs.schemas_response_format_scope_confirm") });
});
const conditionsPutSchema = z.object({ answers: z.array(conditionAnswerSchema), expectedInputVersion: id });
const checkTypes = ["WAGE_CALCULATION", "CONTRACT_ATTENDANCE_COMPARISON", "PAYSLIP_VALIDATION", "DEPOSIT_COMPARISON"] as const;
const checkSchema = z.object({ checkType: z.enum(checkTypes), available: z.boolean(), mode: z.enum(["FULL", "PARTIAL", "NONE"]), missingInputs: z.array(z.string()), reasonCode: z.string().nullable().optional() });
const readinessSchema = z.object({ caseId: id, inputVersion: id, checks: z.array(checkSchema) });
const money = z.number().int().safe();
const optionalMoney = money.nullable().optional();
const minutes = z.number().int().safe().nonnegative();
const manualInputSchema = z.discriminatedUnion("recordType", [
  z.object({ recordType: z.literal("CONTRACT"), source: z.literal("USER_INPUT"), data: z.object({ hourlyWage: optionalMoney, monthlyBasePay: optionalMoney }).catchall(z.json()) }),
  z.object({ recordType: z.literal("PAYSLIP"), source: z.literal("USER_INPUT"), data: z.object({ grossPay: optionalMoney, totalDeductions: optionalMoney, netPay: optionalMoney, hourlyWage: optionalMoney, basePay: optionalMoney, workedMinutes: minutes.nullable().optional(), paymentItems: z.array(money).nullable().optional(), deductionItems: z.array(money).nullable().optional() }).catchall(z.json()) }),
  z.object({ recordType: z.literal("ATTENDANCE"), source: z.literal("USER_INPUT"), data: z.object({ workDate: z.iso.date(), clockIn: z.iso.datetime({ offset: true }), clockOut: z.iso.datetime({ offset: true }), breakMinutes: minutes }).catchall(z.json()) }),
  z.object({ recordType: z.literal("DEPOSIT"), source: z.literal("USER_INPUT"), data: z.object({ paymentMethod: z.enum(["BANK_TRANSFER", "CASH"]), transactionDate: z.iso.date(), amount: money.nonnegative(), sender: z.string().nullable().optional(), memo: z.string().nullable().optional(), source: z.literal("USER_INPUT"), confirmationStatus: z.literal("USER_REPORTED").optional() }).catchall(z.json()) }),
]);
return {recordTypes, recordTypeSchema, manualRecordSchema, manualSavedSchema, conditionIds, conditionSchema, conditionsSchema, conditionAnswerSchema, conditionsPutSchema, checkTypes, checkSchema, readinessSchema, manualInputSchema};
}

export const {recordTypes, recordTypeSchema, manualRecordSchema, manualSavedSchema, conditionIds, conditionSchema, conditionsSchema, conditionAnswerSchema, conditionsPutSchema, checkTypes, checkSchema, readinessSchema, manualInputSchema} = createLocalizedFeaturesCaseInputsSchemas(createTranslation(defaultLocale));
