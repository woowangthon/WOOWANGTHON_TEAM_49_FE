import { z } from "zod";
import { processingSchema } from "../schemas";
const id = z.number().int().positive();
export const valueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
export const fieldStatusSchema = z.enum(["UNCONFIRMED", "CONFIRMED", "MISSING", "UNREADABLE", "CONFLICTED"]);
export const reviewStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "CONFIRMED"]);
export const sourceSchema = z.object({
  documentId: id, page: id.nullable(), text: z.string().nullable().optional(),
  boundingBox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable().optional(),
  coordinateSystem: z.string().nullable().optional(),
});
export const fieldSchema = z.object({
  fieldId: id, key: z.string(), label: z.string(), value: valueSchema, valueType: z.string(), status: fieldStatusSchema,
  editedByUser: z.boolean(), effectiveValueOrigin: z.enum(["SHARED_DEFAULT", "CASE_OVERRIDE"]), hasCaseOverride: z.boolean(),
  confirmedAt: z.iso.datetime({offset: true}).nullable(), source: sourceSchema.nullable(),
});
export const fieldsSchema = z.object({documentId: id, caseId: id, processingStatus: processingSchema, reviewStatus: reviewStatusSchema, fields: z.array(fieldSchema)});
export const previewSchema = z.object({
  documentId: id, mediaType: z.string(), pageCount: id,
  coordinateSystem: z.string().nullable(), rotationDegrees: z.number().nullable(), supportsHighlight: z.boolean(),
  // previewUrl is intentionally not retained or followed. Only the documented authenticated /file is used.
});
const recomputeSchema = z.object({scheduled: z.boolean(), jobId: z.string().nullable().optional()});
export const updateMetaSchema = z.object({
  inputVersion: id.optional(), affectedCaseIds: z.array(id).optional(), recompute: recomputeSchema.optional(),
  caseUpdates: z.array(z.object({caseId: id, inputVersion: id, recompute: recomputeSchema.optional()})).optional(),
});
export const fieldUpdatedSchema = updateMetaSchema.extend({fieldId: id, value: valueSchema, status: fieldStatusSchema});
export const overrideRemovedSchema = updateMetaSchema.extend({fieldId: id, effectiveValueOrigin: z.literal("SHARED_DEFAULT")});
export const historySchema = z.object({
  historyId: id, fieldId: id, previousValue: valueSchema, newValue: valueSchema,
  changedAt: z.iso.datetime({offset:true}), changedBy: z.string(), scope: z.string(),
});
export const reviewSchema = z.object({
  documentId: id, caseId: id, processingStatus: processingSchema, reviewStatus: reviewStatusSchema,
  confirmedFieldCount: z.number().int().nonnegative().optional(), totalFieldCount: z.number().int().nonnegative().optional(),
  unconfirmedFieldIds: z.array(id).optional(), reasonCodes: z.array(z.string()).optional(), confirmed: z.boolean().optional(),
}).extend(updateMetaSchema.shape);
// P0 names replacementId without specifying its scalar type. Preserve opaque string IDs as well as numeric IDs.
export const replacementIdSchema = z.union([id, z.string().min(1).max(200)]);
export const replacementCreatedSchema = z.object({replacementId: replacementIdSchema, documentId: id, originalLinkRetained: z.literal(true)});
// P0 describes processing state and fields but omits the full GET DTO; require these before permitting confirmation.
export const replacementSchema = z.object({
  replacementId: replacementIdSchema, documentId: id, processingStatus: processingSchema,
  fields: z.array(fieldSchema).optional(), originalLinkRetained: z.boolean().optional(),
});
export const replacementConfirmedSchema = updateMetaSchema.extend({documentId: id.optional(), replacementId: replacementIdSchema.optional()});
export type ExtractedField = z.infer<typeof fieldSchema>;
export type FieldValue = z.infer<typeof valueSchema>;
export type SourceDto = z.infer<typeof sourceSchema>;
export type PreviewDto = z.infer<typeof previewSchema>;
export type UpdateMeta = z.infer<typeof updateMetaSchema>;
export type ReplacementId = z.infer<typeof replacementIdSchema>;
export interface ReviewContext { caseId: number; workplaceId: number; documentId: number }
export interface FieldPatch { value?: FieldValue; confirmed?: boolean }
