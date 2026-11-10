import type { z } from "zod";

import type { loginRequestSchema, signupRequestSchema, userSchema } from "./schemas";

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type CurrentUser = z.infer<typeof userSchema>;
export type AuthStatus = "restoring" | "authenticated" | "anonymous" | "signing-out" | "deletion-accepted";
export interface AuthSnapshot {
  status: AuthStatus;
  notice: string | null;
}
