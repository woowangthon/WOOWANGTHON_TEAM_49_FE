import { z } from "zod";

export const payTypeSchema = z.enum(["HOURLY", "MONTHLY"]);
export const caseStatusSchema = z.enum(["CREATED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);
export const caseStepSchema = z.enum(["UPLOAD", "REVIEW", "CONDITIONS", "COMPARE", "RESULT"]);
const id = z.number().int().positive();
export const caseListItemSchema = z.object({
  caseId: id,
  workplaceId: id,
  workplace: z.object({ workplaceId: id, name: z.string(), industry: z.string().nullable().optional(), region: z.string().nullable().optional() }).optional(),
  payType: payTypeSchema,
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  scheduledPayDate: z.iso.date().nullable().optional(),
  status: caseStatusSchema,
  currentStep: caseStepSchema.optional(),
  attentionRequired: z.boolean().optional(),
  attentionCount: z.number().int().nonnegative().optional(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export const caseDetailSchema = caseListItemSchema.extend({
  workplace: z.object({ workplaceId: id, name: z.string(), industry: z.string().nullable().optional(), region: z.string().nullable().optional() }),
  scheduledPayDate: z.iso.date().nullable(),
  currentStep: caseStepSchema,
  documentCount: z.number().int().nonnegative(),
  inputVersion: z.number().int().positive(),
  attentionRequired: z.boolean(),
  attentionCount: z.number().int().nonnegative(),
});
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
  periodStart: z.iso.date("시작일을 입력해 주세요."),
  periodEnd: z.iso.date("종료일을 입력해 주세요."),
  scheduledPayDate: z.union([z.literal(""), z.iso.date("올바른 지급일을 입력해 주세요.")]),
}).refine((value) => value.periodStart <= value.periodEnd, { path: ["periodEnd"], message: "종료일은 시작일보다 빠를 수 없습니다." });
export type CaseListDto = z.infer<typeof caseListItemSchema>;
export type CaseDetailDto = z.infer<typeof caseDetailSchema>;
export type CaseFormValues = z.infer<typeof caseFormSchema>;
export interface CaseCreate {
  workplaceId: number; payType: "HOURLY" | "MONTHLY";
  periodStart: string; periodEnd: string; scheduledPayDate: string | null;
}
export type CasePatch = Partial<Omit<CaseCreate, "workplaceId">> & { expectedInputVersion: number };
