import { z } from "zod";
import { caseDocumentSchema, processingSchema } from "../schemas";
const id = z.number().int().positive();
export const valueSchema = z.json();
export const fieldStatusSchema = z.enum(["UNCONFIRMED", "CONFIRMED", "MISSING", "UNREADABLE", "CONFLICTED", "DEFERRED", "NEEDS_RECONFIRMATION"]);
export const reviewStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "CONFIRMED"]);
export const sourceSchema = z.object({
  documentId: id, page: id.nullable(), text: z.string().nullable().optional(),
  boundingBox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable().optional(),
  coordinateSystem: z.string().nullable().optional(),
});
export const fieldWireSchema = z.object({
  agentKey: z.string().nullable().optional(), fieldId: z.number().int(), key: z.string(), label: z.string(), value: valueSchema, valueType: z.string(), status: fieldStatusSchema,
  editedByUser: z.boolean(), effectiveValueOrigin: z.enum(["SHARED_DEFAULT", "CASE_OVERRIDE"]), hasCaseOverride: z.boolean(),
  confirmedAt: z.string().nullable(), source: z.record(z.string(),z.json()).nullable(),
});
// P0 source is free JSON; interpret optional HTML location metadata separately.
export const fieldViewSchema = fieldWireSchema.extend({source:sourceSchema.nullable()});
export const fieldSchema = fieldWireSchema.transform((value): z.infer<typeof fieldViewSchema> & {rawSource?: Record<string, z.infer<typeof valueSchema>> | null} => {
 const source = sourceSchema.safeParse(value.source);
 return {...value, source:source.success ? source.data : null, rawSource:value.source};
});
export const fieldsSchema = z.object({documentId: z.number().int(), caseId: z.number().int(), processingStatus: z.string(), reviewStatus: z.string(), fields: z.array(fieldSchema)});
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
// HTML API-047 supplement; P0 only declares free JSON here.
const historyValueSchema = z.object({value: valueSchema, status: z.string(), origin: z.string().optional(), originalDocumentId: z.number().int().optional()});
export const historyWireSchema = z.object({historyId: id, scope: z.string(), previous: historyValueSchema, new: historyValueSchema, createdAt: z.string()});
export const historySchema = historyWireSchema.transform(wire=>({...wire, previousValue:wire.previous.value, newValue:wire.new.value, changedAt:wire.createdAt}));
export const historyListSchema = z.object({items:z.array(historySchema)});
export const reviewConfirmedSchema = z.object({documentId:id, reviewStatus:reviewStatusSchema, unconfirmedFieldIds:z.array(id)}).extend(updateMetaSchema.shape);
export const reviewSchema = z.object({
  documentId: id, caseId: id.optional(), processingStatus: processingSchema, reviewStatus: reviewStatusSchema,
  confirmedFieldCount: z.number().int().nonnegative().optional(), totalFieldCount: z.number().int().nonnegative().optional(),
  unconfirmedFieldIds: z.array(id).optional(), reasonCodes: z.array(z.string()).optional(), confirmed: z.boolean().optional(),
}).extend(updateMetaSchema.shape);
// OpenAPI fixes the path scalar; response internals below are HTML supplements.
export const replacementIdSchema = z.number().int();
export const replacementCreatedSchema = z.object({
  replacementId: replacementIdSchema, documentId: id.optional(),
  originalLinkRetained: z.boolean().optional(),
});
export const rawFieldSchema = z.object({
  fieldId: id.optional(), key: z.string().optional(), label: z.string().optional(),
  value: valueSchema.optional(), valueType: z.string().optional(), status: z.string().optional(),
  editedByUser: z.boolean().optional(), effectiveValueOrigin: z.string().optional(),
  hasCaseOverride: z.boolean().optional(), confirmedAt: z.string().nullable().optional(),
  source: sourceSchema.nullable().optional(),
});
export const replacementWireSchema = z.object({
  replacementId: replacementIdSchema, status: z.string().optional(),
  original: caseDocumentSchema.nullish(), candidate: caseDocumentSchema.nullish(),
  fields: z.array(rawFieldSchema).nullish(),
});
export function replacementView(wire: z.infer<typeof replacementWireSchema>) {
  return {...wire, documentId: wire.candidate?.documentId,
    processingStatus: wire.candidate?.processingStatus,
    fields: wire.fields ?? undefined};
}
export const replacementSchema = replacementWireSchema.transform(replacementView);
export const replacementConfirmedSchema = updateMetaSchema.extend({
  documentId: id.optional(), replacementId: replacementIdSchema.optional(), status: z.string().optional(),
});
export type ExtractedField = z.infer<typeof fieldSchema>;
export type FieldValue = z.infer<typeof valueSchema>;
export type SourceDto = z.infer<typeof sourceSchema>;
export type PreviewDto = z.infer<typeof previewSchema>;
export type UpdateMeta = z.infer<typeof updateMetaSchema>;
export type ReplacementId = z.infer<typeof replacementIdSchema>;
export interface ReviewContext { caseId: number; workplaceId: number; documentId: number }
export interface FieldPatch { value?: FieldValue; confirmed?: boolean }
