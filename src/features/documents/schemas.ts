
import {message as describeMessage} from '@/i18n/message';
import { z } from "zod";
import {createTranslation, type Translation} from '@/i18n/translate';
import {defaultLocale} from '@/i18n/config';
export type ConcreteDocumentType = typeof documentTypes[number];
export type DocumentWireDto = z.infer<typeof caseDocumentSchema>;
export type DocumentDto = z.infer<typeof documentSchema>;
export type DocumentStatusDto = z.infer<typeof statusSchema>;
export type LinkDto = z.infer<typeof linkSchema>;
export type LinkValues = z.infer<typeof linkFormSchema>;
export type LinkInput = z.infer<typeof linkPatchSchema>;
export interface DocumentFilters { page: number; size: number; workplaceId?: number; documentType?: string; processingStatus?: string }
export type DocumentContext = { kind: "library" } | { kind: "workplace"; id: number } | { kind: "case"; id: number };

export function createLocalizedFeaturesDocumentsSchemas(translation: Translation) {
  const {} = translation;
const id = z.number().int().positive();
const documentTypes = ["CONTRACT", "ATTENDANCE", "PAYSLIP", "DEPOSIT"] as const;
const uploadDocumentTypes = ["AUTO", ...documentTypes] as const;
const documentTypeErrorCodes = ["DOCUMENT_TYPE_MISMATCH", "DOCUMENT_TYPE_UNRESOLVED"] as const;
const documentTypePatchSchema = z.strictObject({ documentType: z.enum(uploadDocumentTypes) });
const processingStatuses = ["UPLOADED", "PROCESSING", "READ_READY", "READY", "REVIEW_REQUIRED", "FAILED"] as const;
const processingSchema = z.enum(processingStatuses);
const linkSchema = z.object({
  linkId: id, caseId: id, documentId: id, purpose: z.string().nullable(),
  applicableFrom: z.iso.date().nullable(), applicableTo: z.iso.date().nullable(),
  overrideCount: z.number().int().nonnegative().optional(),
});
const caseDocumentSchema = z.object({
  documentId: z.number().int(), workplaceId: z.number().int(),
  documentType: z.enum(uploadDocumentTypes), fileName: z.string(), processingStatus: processingSchema,
  reviewStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "CONFIRMED"]),
  progress: z.number().int(), linkId: z.number().int().nullable(),
  linkedCaseIds: z.array(z.number().int()), uploadedAt: z.string(),
  errorCode: z.string().nullable(), aiMetadata: z.record(z.string(), z.json()).nullable(),
  workplaceName: z.string().nullable().optional(),
});
const documentSchema = caseDocumentSchema;
const statusSchema = z.object({
  documentId: id, processingStatus: processingSchema,
  reviewStatus: documentSchema.shape.reviewStatus.optional(), progress: documentSchema.shape.progress.optional(),
  errorCode: z.string().nullable().optional(),
});
const uploadSchema = statusSchema.extend({ linkId: id.optional(), inputVersion: id.optional(), duplicateCandidateIds: z.array(z.number().int().safe()) });
const mutationSchema = z.object({ inputVersion: id.optional(), affectedCaseIds: z.array(id).optional() });
const impactSchema = z.object({
  documentId: id, affectedCaseIds: z.array(id), linkedCaseCount: z.number().int().nonnegative(),
  derivedTransactionIds: z.array(id), downloadedExternalCopiesCannotBeRecalled: z.boolean(),
});
const linkPatchSchema = z.strictObject({
 expectedInputVersion: id.nullable().optional(), purpose: z.string().max(100).nullable().optional(),
 applicableFrom: z.iso.date().nullable().optional(), applicableTo: z.iso.date().nullable().optional(),
});
const linkCreateSchema = linkPatchSchema.extend({ documentId: id });
const linkFormSchema = z.object({
  purpose: z.string().trim().max(100, describeMessage("documents.schemas_atMost_input")),
  applicableFrom: z.union([z.literal(""), z.iso.date()]),
  applicableTo: z.union([z.literal(""), z.iso.date()]),
}).refine(v => !v.applicableFrom || !v.applicableTo || v.applicableFrom <= v.applicableTo,
  { path: ["applicableTo"], message: describeMessage("documents.schemas_endDate_startDate_count_empty") });
return {documentTypes, uploadDocumentTypes, documentTypeErrorCodes, documentTypePatchSchema, processingStatuses, processingSchema, linkSchema, caseDocumentSchema, documentSchema, statusSchema, uploadSchema, mutationSchema, impactSchema, linkPatchSchema, linkCreateSchema, linkFormSchema};
}

export const {documentTypes, uploadDocumentTypes, documentTypeErrorCodes, documentTypePatchSchema, processingStatuses, processingSchema, linkSchema, caseDocumentSchema, documentSchema, statusSchema, uploadSchema, mutationSchema, impactSchema, linkPatchSchema, linkCreateSchema, linkFormSchema} = createLocalizedFeaturesDocumentsSchemas(createTranslation(defaultLocale));
