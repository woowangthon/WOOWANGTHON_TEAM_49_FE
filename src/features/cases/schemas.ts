
import {message as describeMessage} from '@/i18n/message';
import { z } from "zod";
import {createTranslation, type Translation} from '@/i18n/translate';
import {defaultLocale} from '@/i18n/config';
export type CaseListDto = z.infer<typeof caseListItemSchema>;
export type CaseDetailDto = z.infer<typeof caseDetailSchema>;
export type CaseFormValues = z.infer<typeof caseFormSchema>;
export interface CaseCreate {
  workplaceId: number; payType: "HOURLY" | "MONTHLY";
  periodStart: string; periodEnd: string; scheduledPayDate: string | null;
}
export type CasePatch = Partial<Omit<CaseCreate, "workplaceId">> & { expectedInputVersion: number };

export function createLocalizedFeaturesCasesSchemas(translation: Translation) {
  const {} = translation;
const payTypeSchema = z.enum(["HOURLY", "MONTHLY"]);
const caseStatusSchema = z.enum(["CREATED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);
const caseStepSchema = z.enum(["UPLOAD", "REVIEW", "CONDITIONS", "COMPARE", "RESULT"]);
const id = z.number().int().positive();
const caseWireSchema = z.object({
 caseId:z.number().int(), workplaceId:z.number().int(), workplace:z.record(z.string(),z.json()),
 payType:payTypeSchema,periodStart:z.string(),periodEnd:z.string(),scheduledPayDate:z.string().nullable(),
 status:caseStatusSchema,currentStep:caseStepSchema,documentCount:z.number().int(),latestCalculationId:z.number().int().nullable(),inputVersion:z.number().int(),attentionRequired:z.boolean(),attentionCount:z.number().int(),updatedAt:z.string(),
});
const caseListItemSchema = caseWireSchema;
const caseDetailSchema = caseWireSchema;
const caseCreatedSchema = z.object({
  caseId: id, status: z.literal("CREATED"), inputVersion: z.number().int().positive(),
  recompute: z.unknown().optional(),
});
const deletionImpactSchema = z.object({
  linkedDocumentCount: z.number().int().nonnegative(),
  sharedDocumentCount: z.number().int().nonnegative(),
  reportCount: z.number().int().nonnegative(),
  willUnlinkSharedDocuments: z.boolean(),
  willDeleteSharedOriginals: z.boolean(),
  willRevokeCaseAccessImmediately: z.boolean(),
});
const caseFormSchema = z.object({
  payType: payTypeSchema,
  periodStart: z.iso.date(describeMessage("cases.schemas_startDate_input")),
  periodEnd: z.iso.date(describeMessage("cases.schemas_endDate_input")),
  scheduledPayDate: z.union([z.literal(""), z.iso.date(describeMessage("cases.schemas_valid_payment_input"))]),
}).refine((value) => value.periodStart <= value.periodEnd, { path: ["periodEnd"], message: describeMessage("cases.schemas_endDate_startDate_count_empty") });
return {payTypeSchema, caseStatusSchema, caseStepSchema, caseWireSchema, caseListItemSchema, caseDetailSchema, caseCreatedSchema, deletionImpactSchema, caseFormSchema};
}

export const {payTypeSchema, caseStatusSchema, caseStepSchema, caseWireSchema, caseListItemSchema, caseDetailSchema, caseCreatedSchema, deletionImpactSchema, caseFormSchema} = createLocalizedFeaturesCasesSchemas(createTranslation(defaultLocale));
