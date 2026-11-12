import { versionSchema } from "@/features/results/schemas";
import { z } from "zod";
// Conditional P4 response adapters: P0 omits these DTOs.
export const questionsSchema=z.object({questions:z.array(z.object({questionId:z.number(),type:z.string(),question:z.string(),reason:z.string(),relatedItemId:z.string().nullable()}))});
export const reportSchema=z.object({reportId:z.number().int().positive(),version:z.number(),status:z.enum(["PROCESSING","READY","FAILED"]),basedOnInputVersion:z.number(),referencedSnapshots:z.record(z.string(),versionSchema),selectedDocumentIds:z.array(z.number()),createdAt:z.string(),isCurrent:z.boolean().optional(),ruleSetVersions:z.array(z.string()).optional(),errorCode:z.string().nullable().optional()});
export const reportsSchema=z.object({items:z.array(reportSchema),total:z.number().int().nonnegative().optional()});
export type Report=z.infer<typeof reportSchema>;
// P0 omits these details; conditional P4 response adapters, not confirmed contracts.
export const inquirySchema=z.object({text:z.string(),basedOnResultVersions:z.record(z.string(),z.number().nullable()).optional(),requiresUserReview:z.boolean().optional()});
// P0 Envelope.data is free JSON; inner DTO rules follow supplementary API_REFERENCE.html.
export const centerSchema=z.object({centerId:z.number().int(),name:z.string(),region:z.string(),categories:z.array(z.string()),phone:z.string(),website:z.string(),businessHours:z.string().nullable(),languages:z.json(),visitInformation:z.json(),sourceUrl:z.string(),verifiedAt:z.iso.date(),isNationwide:z.boolean(),dataSource:z.string(),notes:z.string()});
export const centersSchema=z.object({items:z.array(centerSchema),page:z.number().int().positive(),size:z.number().int().positive(),total:z.number().int().nonnegative(),nationwideFallbackUsed:z.boolean(),dataStatus:z.enum(["NATIONWIDE_ONLY","AVAILABLE"])});
export type ConsultationCenter=z.infer<typeof centerSchema>;
export type CenterList=z.infer<typeof centersSchema>;
