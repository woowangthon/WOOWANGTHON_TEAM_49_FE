import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().trim().pipe(z.email("올바른 이메일 주소를 입력해 주세요.")),
  // P0 does not specify length/complexity rules. The server remains authoritative.
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

export const signupRequestSchema = loginRequestSchema.extend({
  name: z.string().trim().min(1, "이름을 입력해 주세요."),
});

/** P0 login user fields only; createdAt and other P4 fields are not assumed. */
export const userSchema = z.object({
  userId: z.number().int().positive(),
  email: z.string().pipe(z.email()),
  name: z.string(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int().nonnegative(),
  user: userSchema,
});
