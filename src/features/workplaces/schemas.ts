
import { translate } from "@/i18n/translate";
import { z } from "zod";

export const employmentStatusSchema = z.enum(["CURRENT", "FORMER"]);
export const workplaceSchema = z.object({
  workplaceId: z.number().int(),
  name: z.string(),
  industry: z.string().nullable(),
  region: z.string().nullable(),
  employmentStatus: employmentStatusSchema,
  caseCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workplaceCreateSchema = z.strictObject({
 name: z.string().min(1).max(200), industry: z.string().max(200).nullable().optional(),
 region: z.string().max(200).nullable().optional(), employmentStatus: employmentStatusSchema.optional(),
});
export const workplacePatchSchema = workplaceCreateSchema.extend({
 name: workplaceCreateSchema.shape.name.nullable().optional(), employmentStatus: employmentStatusSchema.nullable().optional(),
});
export const workplaceFormSchema = z.object({
  name: z.string().trim().min(1, translate("workplaces.schemas_workplace_input")).max(200, translate("workplaces.schemas_atMost_input")),
  industry: z.string().trim().max(200, translate("workplaces.schemas_atMost_input")),
  region: z.string().trim().max(200, translate("workplaces.schemas_atMost_input")),
  employmentStatus: employmentStatusSchema,
});
export type WorkplaceDto = z.infer<typeof workplaceSchema>;
export type WorkplaceFormValues = z.infer<typeof workplaceFormSchema>;
export type WorkplaceWrite = z.infer<typeof workplaceCreateSchema>;
