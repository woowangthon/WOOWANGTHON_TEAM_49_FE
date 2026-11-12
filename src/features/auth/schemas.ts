
import { translate } from "@/i18n/translate";
import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().trim().pipe(z.email(translate("auth.schemas_valid_email_address_input"))),
  // P0 does not specify length/complexity rules. The server remains authoritative.
  password: z.string().min(1, translate("auth.schemas_password_input")),
});

// Request DTOs preserve P0 values; form normalization is separate.
const email = z.string().min(3, translate("auth.schemas_input_length_format_confirm")).max(254, translate("auth.schemas_input_length_format_confirm")).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, translate("auth.schemas_input_length_format_confirm"));
const password = z.string().min(8, translate("auth.schemas_input_length_format_confirm")).max(128, translate("auth.schemas_input_length_format_confirm"));
export const signupRequestSchema = z.strictObject({
  email, password, name: z.string().min(1, translate("auth.schemas_name_input")).max(100, translate("auth.schemas_input_length_format_confirm")),
});
export const signupFormSchema = signupRequestSchema.extend({
  email: z.string().trim().pipe(email), name: z.string().trim().pipe(signupRequestSchema.shape.name),
});
export const forgotPasswordRequestSchema = z.strictObject({ email });
export const resetPasswordRequestSchema = z.strictObject({
  token: z.string().min(20, translate("auth.schemas_input_length_format_confirm")).max(200, translate("auth.schemas_input_length_format_confirm")),
  newPassword: password,
});

/** P0 login user fields only; createdAt and other P4 fields are not assumed. */
export const userSchema = z.object({
  userId: z.number().int(),
  email: z.string(),
  name: z.string(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int(),
  user: userSchema,
});
