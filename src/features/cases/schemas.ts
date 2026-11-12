
import { translate } from "@/i18n/translate";
import { z } from "zod";

export const payTypeSchema = z.enum(["HOURLY", "MONTHLY"]);
export const caseStatusSchema = z.enum(["CREATED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);
export const caseStepSchema = z.enum(["UPLOAD", "REVIEW", "CONDITIONS", "COMPARE", "RESULT"]);
const id = z.number().int().positive();
export const caseWireSchema = z.object({
 caseId:z.number().int(), workplaceId:z.number().int(), workplace:z.record(z.string(),z.json()),
 payType:payTypeSchema,periodStart:z.string(),periodEnd:z.string(),scheduledPayDate:z.string().nullable(),
 status:caseStatusSchema,currentStep:caseStepSchema,documentCount:z.number().int(),latestCalculationId:z.number().int().nullable(),inputVersion:z.number().int(),attentionRequired:z.boolean(),attentionCount:z.number().int(),updatedAt:z.string(),
});
export const caseListItemSchema = caseWireSchema;
export const caseDetailSchema = caseWireSchema;
export const caseCreatedSchema = z.object({
  caseId: id, status: z.literal("CREATED"), inputVersion: z.number().int().positive(),
  recompute: z.unknown().optional(),
});
export const deletionImpactSchema = z.object({
  linkedDocumentCount: z.number().int().nonnegative(),
  sharedDocumentCount: z.number().int().nonnegative(),
  reportCount: z.number().int().nonnegative(),
  willUnlinkSharedDocuments: z.boolean(),
  willDeleteSharedOriginals: z.boolean(),
  willRevokeCaseAccessImmediately: z.boolean(),
});
export const caseFormSchema = z.object({
  payType: payTypeSchema,
  periodStart: z.iso.date(translate("cases.schemas_startDate_input")),
  periodEnd: z.iso.date(translate("cases.schemas_endDate_input")),
  scheduledPayDate: z.union([z.literal(""), z.iso.date(translate("cases.schemas_valid_payment_input"))]),
}).refine((value) => value.periodStart <= value.periodEnd, { path: ["periodEnd"], message: translate("cases.schemas_endDate_startDate_count_empty") });
export type CaseListDto = z.infer<typeof caseListItemSchema>;
export type CaseDetailDto = z.infer<typeof caseDetailSchema>;
export type CaseFormValues = z.infer<typeof caseFormSchema>;
export interface CaseCreate {
  workplaceId: number; payType: "HOURLY" | "MONTHLY";
  periodStart: string; periodEnd: string; scheduledPayDate: string | null;
}
export type CasePatch = Partial<Omit<CaseCreate, "workplaceId">> & { expectedInputVersion: number };
