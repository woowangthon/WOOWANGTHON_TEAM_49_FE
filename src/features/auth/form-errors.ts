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
      setError("email", { message: "이미 가입된 이메일입니다. 로그인해 주세요." }, { shouldFocus: true });
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
      ? "이메일 또는 비밀번호를 확인해 주세요."
      : error.status === 429
        ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
        : error.status === 422
          ? "입력 내용을 확인해 주세요. 서버에서 요청을 처리하지 못했습니다."
          : "요청을 처리하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.";
    setError("root.server", { message });
    return;
  }
  setError("root.server", { message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." });
}
