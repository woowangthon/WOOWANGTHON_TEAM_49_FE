import { z } from "zod";
import { pageSchema } from "@/lib/api/schema";
import { sourceSchema } from "@/features/documents/review/schemas";
const integer = z.number().int().nonnegative();
const scalar = z.number().finite();
const money = scalar.int().safe().nullable();
const date = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });
const moneyUnits = new Set(["KRW", "MONEY_KRW", "KRW_PER_HOUR"]);
function validateMoneyValues(value:Record<string,unknown>,keys:string[],unit:unknown,ctx:z.RefinementCtx) {
 if(typeof unit!=="string" || !moneyUnits.has(unit))return;
 for(const key of keys)if(typeof value[key]==="number" && !Number.isSafeInteger(value[key]))ctx.addIssue({code:"custom",path:[key],message:"원화는 안전한 범위의 정수여야 합니다."});
}
export const freshnessSchema = z.enum(["CURRENT", "STALE", "UPDATING", "FAILED"]);
export const resultStatusSchema = z.enum(["MATCH", "DIFFERENCE", "INSUFFICIENT_INFORMATION", "REVIEW_REQUIRED"]);
export const calculationStatusSchema = z.enum(["COMPLETE", "PARTIAL", "REVIEW_REQUIRED"]);
export const jobStatusSchema = z.enum(["PENDING", "RUNNING", "SUCCEEDED", "PARTIAL", "FAILED", "SUPERSEDED"]);
// P0 omits inner DTO definitions. P4 informs these OPTIONAL fields; absence is not an error.
export const formulaSchema = z.object({ expression:z.string().optional(), displayText:z.string().optional(), inputs:z.array(z.object({key:z.string(),value:z.union([z.string(),scalar,z.null()]),unit:z.string().nullable().optional()}).passthrough()).optional() }).passthrough();
export const ruleSchema = z.object({ruleId:z.string().optional(),ruleVersion:z.string().optional(),verified:z.boolean().optional()}).passthrough();
export const basisSchema = z.object({semanticMatch:z.boolean().optional(),scope:z.string().optional(),unit:z.string().optional(),periodStart:date.optional(),periodEnd:date.optional()}).passthrough();
export const resultSourceSchema = sourceSchema.extend({fieldId:integer.optional()}).passthrough();
export const calculationItemSchema = z.object({type:z.string().optional(),label:z.string().optional(),status:z.enum(["CALCULATED","NOT_APPLICABLE","INSUFFICIENT_INFORMATION","REVIEW_REQUIRED"]).optional(),amount:money.optional(),currency:z.literal("KRW").optional(),formula:formulaSchema.nullable().optional(),rule:ruleSchema.nullable().optional(),reasonCode:z.string().nullable().optional()}).passthrough();
export const calculationSchema = z.object({calculationId:integer,version:integer,basedOnInputVersion:integer,status:calculationStatusSchema,items:z.array(calculationItemSchema),calculatedSubtotal:money,grossPay:money,freshness:freshnessSchema.optional(),createdAt:timestamp.optional()}).passthrough();
export const comparisonItemSchema = z.object({type:z.string().optional(),status:resultStatusSchema.optional(),contractValue:scalar.nullable().optional(),attendanceValue:scalar.nullable().optional(),payslipValue:scalar.nullable().optional(),difference:scalar.nullable().optional(),comparisonBasis:basisSchema.nullable().optional()}).passthrough().superRefine((v,ctx)=>validateMoneyValues(v,["contractValue","attendanceValue","payslipValue","difference"],v.comparisonBasis?.unit,ctx));
export const comparisonSchema = z.object({comparisonId:integer,version:integer,basedOnInputVersion:integer,items:z.array(comparisonItemSchema),status:z.union([resultStatusSchema,calculationStatusSchema]).optional(),createdAt:timestamp.optional()}).passthrough();
export const validationCheckSchema = z.object({status:resultStatusSchema.optional(),itemSum:money.optional(),statedTotal:money.optional(),calculated:money.optional(),stated:money.optional(),difference:money.optional()}).passthrough();
export const validationSchema = z.object({validationId:integer,version:integer,paymentTotal:validationCheckSchema,deductionTotal:validationCheckSchema,netPay:validationCheckSchema,basedOnInputVersion:integer.optional(),createdAt:timestamp.optional()}).passthrough();
export const resultItemSchema = z.object({id:z.string(),title:z.string(),status:resultStatusSchema,calculatedValue:scalar.nullable(),documentValue:scalar.nullable(),difference:scalar.nullable(),unit:z.string().nullable(),periodStart:date.nullable(),periodEnd:date.nullable(),formula:formulaSchema.nullable(),rule:ruleSchema.nullable(),comparisonBasis:basisSchema.nullable(),sources:z.array(resultSourceSchema),confirmedAt:timestamp.nullable(),nextAction:z.string().nullable().optional()}).passthrough().superRefine((v,ctx)=>validateMoneyValues(v,["calculatedValue","documentValue","difference"],v.unit,ctx));
export const versionSchema = z.object({snapshotId:integer.nullable(),version:integer.nullable(),inputVersion:integer,createdAt:timestamp.nullable(),freshness:freshnessSchema}).passthrough();
export const resultsSchema = z.object({
 caseId:integer,currentInputVersion:integer,resultVersion:integer.nullable(),
 summary:z.object({calculationStatus:calculationStatusSchema.nullable(),comparisonStatus:resultStatusSchema.nullable(),counts:z.object({match:integer,difference:integer,insufficientInformation:integer,reviewRequired:integer}).passthrough()}).passthrough(),
 freshness:z.object({overall:freshnessSchema,hasOutdatedResults:z.boolean().optional(),activeJobId:z.string().nullable().optional()}).passthrough(),
 versions:z.record(z.string(),versionSchema.nullable()),items:z.array(resultItemSchema),
 calculation:calculationSchema.nullable(),comparison:comparisonSchema.nullable(),payslipValidation:validationSchema.nullable(),depositComparison:z.record(z.string(),z.unknown()).nullable().optional(),
}).passthrough();
// P0 guarantees job identity/status; P4 metadata remains optional and is validated when present.
export const jobSchema = z.object({jobId:z.string().min(1),status:jobStatusSchema,caseId:integer.optional(),requestedInputVersion:integer.optional(),affectedChecks:z.array(z.string()).optional(),createdAt:timestamp.optional(),completedAt:timestamp.nullable().optional(),errorCode:z.string().nullable().optional()}).passthrough();
export const historySchemas = {calculations:pageSchema(calculationSchema),comparisons:pageSchema(comparisonSchema),"payslip-validations":pageSchema(validationSchema)};
export type Results = z.infer<typeof resultsSchema>;
export type ResultSource = z.infer<typeof resultSourceSchema>;

export type HistoryDto = z.infer<(typeof historySchemas)[keyof typeof historySchemas]>;

export type CalculationDto = z.infer<typeof calculationSchema>;
