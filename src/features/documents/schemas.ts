import { z } from "zod";

const id = z.number().int().positive();
export const documentTypes = ["CONTRACT", "ATTENDANCE", "PAYSLIP", "DEPOSIT"] as const;
export const processingStatuses = ["UPLOADED", "PROCESSING", "READ_READY", "READY", "REVIEW_REQUIRED", "FAILED"] as const;
export const processingSchema = z.enum(processingStatuses);
export const linkSchema = z.object({
  linkId: id, caseId: id, documentId: id, purpose: z.string(),
  applicableFrom: z.iso.date().nullable(), applicableTo: z.iso.date().nullable(),
  overrideCount: z.number().int().nonnegative().optional(),
});
// P0 DocumentDTO: no nested link; nullable is distinct from missing.
export const caseDocumentSchema = z.object({
  documentId: z.number().int(), workplaceId: z.number().int(),
  documentType: z.enum(documentTypes), fileName: z.string(), processingStatus: processingSchema,
  reviewStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "CONFIRMED"]),
  progress: z.number().int(), linkId: z.number().int().nullable(),
  linkedCaseIds: z.array(z.number().int()), uploadedAt: z.string(),
  errorCode: z.string().nullable(), aiMetadata: z.record(z.string(), z.json()).nullable(),
  workplaceName: z.string().nullable().optional(),
});
export const documentSchema = caseDocumentSchema;
export type DocumentWireDto = z.infer<typeof caseDocumentSchema>;
export const statusSchema = z.object({
  documentId: id, processingStatus: processingSchema,
  reviewStatus: documentSchema.shape.reviewStatus.optional(), progress: documentSchema.shape.progress.optional(),
  errorCode: z.string().nullable().optional(),
});
export const uploadSchema = statusSchema.extend({ linkId: id.optional(), inputVersion: id.optional() });
export const mutationSchema = z.object({ inputVersion: id.optional(), affectedCaseIds: z.array(id).optional() });
export const impactSchema = z.object({
  documentId: id, linkedCaseIds: z.array(id), linkedCaseCount: z.number().int().nonnegative(),
  canDeleteOriginal: z.boolean(), reasonCode: z.string().nullable(),
}).refine(value => value.linkedCaseIds.length === value.linkedCaseCount, "삭제 영향의 연결 수가 일치하지 않습니다.");
export const linkFormSchema = z.object({
  purpose: z.string().trim().min(1, "연결 목적을 입력해 주세요."),
  applicableFrom: z.union([z.literal(""), z.iso.date()]),
  applicableTo: z.union([z.literal(""), z.iso.date()]),
}).refine(v => !v.applicableFrom || !v.applicableTo || v.applicableFrom <= v.applicableTo,
  { path: ["applicableTo"], message: "종료일은 시작일보다 빠를 수 없습니다." });
export type DocumentDto = z.infer<typeof documentSchema>;
export type DocumentStatusDto = z.infer<typeof statusSchema>;
export type LinkDto = z.infer<typeof linkSchema>;
export type LinkValues = z.infer<typeof linkFormSchema>;
export interface LinkInput { purpose: string; applicableFrom: string | null; applicableTo: string | null; expectedInputVersion: number }
export interface DocumentFilters { page: number; size: number; workplaceId?: number; documentType?: string; processingStatus?: string }
export type DocumentContext = { kind: "library" } | { kind: "workplace"; id: number } | { kind: "case"; id: number };
