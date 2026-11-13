
import {message as describeMessage} from '@/i18n/message';
import { z } from "zod";
import {createTranslation, type Translation} from '@/i18n/translate';
import {defaultLocale} from '@/i18n/config';
export type WorkplaceDto = z.infer<typeof workplaceSchema>;
export type WorkplaceFormValues = z.infer<typeof workplaceFormSchema>;
export type WorkplaceWrite = z.infer<typeof workplaceCreateSchema>;

export function createLocalizedFeaturesWorkplacesSchemas(translation: Translation) {
  const {} = translation;
const employmentStatusSchema = z.enum(["CURRENT", "FORMER"]);
const workplaceSchema = z.object({
  workplaceId: z.number().int(),
  name: z.string(),
  industry: z.string().nullable(),
  region: z.string().nullable(),
  employmentStatus: employmentStatusSchema,
  caseCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const workplaceCreateSchema = z.strictObject({
 name: z.string().min(1).max(200), industry: z.string().max(200).nullable().optional(),
 region: z.string().max(200).nullable().optional(), employmentStatus: employmentStatusSchema.optional(),
});
const workplacePatchSchema = workplaceCreateSchema.extend({
 name: workplaceCreateSchema.shape.name.nullable().optional(), employmentStatus: employmentStatusSchema.nullable().optional(),
});
const workplaceFormSchema = z.object({
  name: z.string().trim().min(1, describeMessage("workplaces.schemas_workplace_input")).max(200, describeMessage("workplaces.schemas_atMost_input")),
  industry: z.string().trim().max(200, describeMessage("workplaces.schemas_atMost_input")),
  region: z.string().trim().max(200, describeMessage("workplaces.schemas_atMost_input")),
  employmentStatus: employmentStatusSchema,
});
return {employmentStatusSchema, workplaceSchema, workplaceCreateSchema, workplacePatchSchema, workplaceFormSchema};
}

export const {employmentStatusSchema, workplaceSchema, workplaceCreateSchema, workplacePatchSchema, workplaceFormSchema} = createLocalizedFeaturesWorkplacesSchemas(createTranslation(defaultLocale));
