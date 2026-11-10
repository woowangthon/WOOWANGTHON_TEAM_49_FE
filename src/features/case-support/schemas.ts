import { z } from "zod";
// Conditional P4 response adapters: P0 omits these DTOs.
export const questionsSchema=z.object({questions:z.array(z.object({questionId:z.number(),type:z.string(),question:z.string(),reason:z.string(),relatedItemId:z.string().optional()}))});
export const reportSchema=z.object({reportId:z.number().int().positive(),version:z.number(),status:z.enum(["PROCESSING","READY","FAILED"]),basedOnInputVersion:z.number(),referencedSnapshots:z.record(z.string(),z.number().nullable()),selectedDocumentIds:z.array(z.number()),createdAt:z.string(),isCurrent:z.boolean().optional(),ruleSetVersions:z.array(z.string()).optional(),errorCode:z.string().nullable().optional()});
export const reportsSchema=z.object({items:z.array(reportSchema)});
export type Report=z.infer<typeof reportSchema>;
