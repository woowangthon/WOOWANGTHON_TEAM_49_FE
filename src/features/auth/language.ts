import { z } from 'zod';
import { backendLanguages } from '@/i18n/config';
export const languageRequestSchema = z.strictObject({language: z.enum(backendLanguages)});
export const languageResponseSchema = z.object({language: z.enum(backendLanguages)});
