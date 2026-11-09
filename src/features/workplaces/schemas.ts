import { z } from "zod";

export const employmentStatusSchema = z.enum(["CURRENT", "FORMER"]);
export const workplaceSchema = z.object({
  workplaceId: z.number().int().positive(),
  name: z.string(),
  industry: z.string().nullable(),
  region: z.string().nullable(),
  employmentStatus: employmentStatusSchema,
  caseCount: z.number().int().nonnegative(),
  // Dates are not required by the UI; do not assume lightweight responses include them.
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const workplaceFormSchema = z.object({
  name: z.string().trim().min(1, "사업장명을 입력해 주세요."),
  industry: z.string().trim(),
  region: z.string().trim(),
  employmentStatus: employmentStatusSchema,
});
export type WorkplaceDto = z.infer<typeof workplaceSchema>;
export type WorkplaceFormValues = z.infer<typeof workplaceFormSchema>;
export interface WorkplaceWrite {
  name: string;
  industry: string | null;
  region: string | null;
  employmentStatus: z.infer<typeof employmentStatusSchema>;
}
