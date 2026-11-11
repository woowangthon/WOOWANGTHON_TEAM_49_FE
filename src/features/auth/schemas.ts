import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().trim().pipe(z.email("올바른 이메일 주소를 입력해 주세요.")),
  // P0 does not specify length/complexity rules. The server remains authoritative.
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

// Request DTOs preserve P0 values; form normalization is separate.
const email = z.string().min(3, "입력 길이 또는 형식을 확인해 주세요.").max(254, "입력 길이 또는 형식을 확인해 주세요.").regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "입력 길이 또는 형식을 확인해 주세요.");
const password = z.string().min(8, "입력 길이 또는 형식을 확인해 주세요.").max(128, "입력 길이 또는 형식을 확인해 주세요.");
export const signupRequestSchema = z.strictObject({
  email, password, name: z.string().min(1, "이름을 입력해 주세요.").max(100, "입력 길이 또는 형식을 확인해 주세요."),
});
export const signupFormSchema = signupRequestSchema.extend({
  email: z.string().trim().pipe(email), name: z.string().trim().pipe(signupRequestSchema.shape.name),
});
export const forgotPasswordRequestSchema = z.strictObject({ email });
export const resetPasswordRequestSchema = z.strictObject({
  token: z.string().min(20, "입력 길이 또는 형식을 확인해 주세요.").max(200, "입력 길이 또는 형식을 확인해 주세요."),
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
