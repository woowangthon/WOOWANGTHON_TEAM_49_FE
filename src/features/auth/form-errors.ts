
import { translate } from "@/i18n/translate";
import type { UseFormSetError } from "react-hook-form";

import { ApiError } from "@/lib/api/error";

export interface AuthFormValues {
  email: string;
  password: string;
  name: string;
}

export function applyAuthError(error: unknown, setError: UseFormSetError<AuthFormValues>, mode: "login" | "signup") {
  if (error instanceof Error && error.name === "AbortError") return;
  if (error instanceof ApiError) {
    if (mode === "signup" && error.errorCode === "EMAIL_ALREADY_EXISTS") {
      setError("email", { message: translate("auth.formErrors_registration_email_login") }, { shouldFocus: true });
      return;
    }
    if (error.status === 422) {
      let mapped = false;
      error.fieldErrors.forEach(({ field, reason }) => {
        const key = field.split(".").at(-1);
        if (key === "email" || key === "password" || (key === "name" && mode === "signup")) {
          setError(key, { message: reason }, { shouldFocus: !mapped });
          mapped = true;
        }
      });
      if (mapped) return;
    }
    const message = error.status === 401 && mode === "login"
      ? translate("auth.formErrors_email_password_confirm")
      : error.status === 429
        ? translate("auth.accountScreens_request_retry")
        : error.status === 422
          ? translate("auth.formErrors_input_content_confirm_request_processing_failure")
          : translate("auth.formErrors_request_processing_failure_link_confirm_retry");
    setError("root.server", { message });
    return;
  }
  setError("root.server", { message: translate("auth.formErrors_request_processing_failure_retry") });
}
