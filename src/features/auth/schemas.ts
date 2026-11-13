
import {message as describeMessage} from '@/i18n/message';
import { z } from "zod";
import {createTranslation, type Translation} from '@/i18n/translate';
import {defaultLocale} from '@/i18n/config';

export function createLocalizedFeaturesAuthSchemas(translation: Translation) {
  const {} = translation;
const loginRequestSchema = z.object({
  email: z.string().trim().pipe(z.email(describeMessage("auth.schemas_valid_email_address_input"))),
  // P0 does not specify length/complexity rules. The server remains authoritative.
  password: z.string().min(1, describeMessage("auth.schemas_password_input")),
});
const email = z.string().min(3, describeMessage("auth.schemas_input_length_format_confirm")).max(254, describeMessage("auth.schemas_input_length_format_confirm")).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, describeMessage("auth.schemas_input_length_format_confirm"));
const password = z.string().min(8, describeMessage("auth.schemas_input_length_format_confirm")).max(128, describeMessage("auth.schemas_input_length_format_confirm"));
const signupRequestSchema = z.strictObject({
  email, password, name: z.string().min(1, describeMessage("auth.schemas_name_input")).max(100, describeMessage("auth.schemas_input_length_format_confirm")),
});
const signupFormSchema = signupRequestSchema.extend({
  email: z.string().trim().pipe(email), name: z.string().trim().pipe(signupRequestSchema.shape.name),
});
const forgotPasswordRequestSchema = z.strictObject({ email });
const resetPasswordRequestSchema = z.strictObject({
  token: z.string().min(20, describeMessage("auth.schemas_input_length_format_confirm")).max(200, describeMessage("auth.schemas_input_length_format_confirm")),
  newPassword: password,
});
const userSchema = z.object({
  language: z.string().nullish(),
  userId: z.number().int(),
  email: z.string(),
  name: z.string(),
});
const loginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int(),
  user: userSchema,
});
return {loginRequestSchema, signupRequestSchema, signupFormSchema, forgotPasswordRequestSchema, resetPasswordRequestSchema, userSchema, loginResponseSchema};
}

export const {loginRequestSchema, signupRequestSchema, signupFormSchema, forgotPasswordRequestSchema, resetPasswordRequestSchema, userSchema, loginResponseSchema} = createLocalizedFeaturesAuthSchemas(createTranslation(defaultLocale));
