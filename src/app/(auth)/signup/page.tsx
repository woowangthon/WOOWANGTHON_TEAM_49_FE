import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
