import { z } from "zod";
export const freshnessSchema = z.enum(["CURRENT", "STALE", "UPDATING", "FAILED"]);
// Preserve additional server fields; never synthesize missing results.
export const sectionSchema = z.record(z.string(), z.unknown());
export const resultsSchema = z.object({ caseId: z.number(), currentInputVersion: z.number(), resultVersion: z.number().nullable(), summary: sectionSchema, freshness: z.object({ overall: freshnessSchema }).passthrough(), versions: z.record(z.string(), sectionSchema.nullable()), items: z.array(sectionSchema), calculation: sectionSchema.nullable(), comparison: sectionSchema.nullable(), payslipValidation: sectionSchema.nullable() }).passthrough();
export type Results = z.infer<typeof resultsSchema>;
