
import { translate } from "@/i18n/translate";
import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = { title: translate("common.page_signUp") };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
