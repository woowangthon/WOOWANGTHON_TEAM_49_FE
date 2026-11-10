"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TextField } from "@/components/ui/text-field";
import { useAppServices } from "@/hooks/use-app-services";
import { mockEnabled } from "@/lib/config/mock";

import { applyAuthError, type AuthFormValues } from "../form-errors";
import { useAuth } from "../hooks/use-auth";
import { loginHref, safeReturnTo } from "../redirect";
import { loginRequestSchema, signupRequestSchema } from "../schemas";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const { auth, authApi } = useAppServices();
  const { notice } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("next"));
  const id = useId();
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const [completed, setCompleted] = useState(false);
  const schema = signup ? signupRequestSchema : loginRequestSchema.extend({ name: z.string() });
  const { register, handleSubmit, setError, setFocus, resetField, formState: { errors, isSubmitting } } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const busy = isSubmitting || completed;
  useLayoutEffect(() => {
    // Server errors arrive while controls are disabled. Focus after they are enabled again.
    if (busy) return;
    const invalid = (["name", "email", "password"] as const).find((field) => errors[field]);
    if (invalid) setFocus(invalid);
    else if (errors.root?.server) errorSummary.current?.focus();
  }, [busy, errors, setFocus]);
  async function submit(values: AuthFormValues) {
    try {
      if (signup) {
        await authApi.signup({ email: values.email, password: values.password, name: values.name });
        setCompleted(true);
        resetField("password");
        router.replace(loginHref(returnTo, true));
      } else {
        await auth.login({ email: values.email, password: values.password });
        resetField("password");
        setCompleted(true);
        // Guest AuthGate handles the validated destination after state changes.
      }
    } catch (error) {
      applyAuthError(error, setError, mode);
    }
  }

  return (
    <section className="w-full min-w-0 rounded-card bg-surface p-6 shadow-card sm:p-8" aria-labelledby={`${id}-title`}>
      <p className="mb-3 text-caption font-bold text-muted">내 급여를 이해하는 첫걸음</p>
      <h1 id={`${id}-title`} className="text-2xl font-extrabold tracking-tight">{signup ? "회원가입" : "로그인"}</h1>
      {process.env.NODE_ENV === "development" && mockEnabled && <div className="mt-4 break-words rounded-control bg-amber-100 p-3 text-sm text-amber-950"><p>개발용 가상 인증입니다. 실제 개인정보를 입력하지 마세요.</p><p>테스트 이메일: worker@example.com</p><p>테스트 비밀번호: password1234</p><p>잘못된 비밀번호로 로그인 실패, 같은 이메일로 가입 중복을 확인할 수 있습니다.</p></div>}
      <p className="mt-3 text-body text-muted">{signup ? "계정을 만들고 내 근무 자료를 한곳에서 관리하세요." : "계속하려면 월급잇다 계정으로 로그인해 주세요."}</p>
      {!signup && params.get("registered") === "1" && <p role="status" className="mt-5 rounded-control bg-success-soft p-4 text-body">회원가입이 완료되었습니다. 로그인해 주세요.</p>}
      {notice && <p role="status" className="mt-5 rounded-control bg-neutral-soft p-4 text-body">{notice}</p>}
      <form noValidate onSubmit={handleSubmit(submit)} aria-busy={busy} className="mt-8 space-y-5">
        {signup && <TextField label="이름" id={`${id}-name`} autoComplete="name" required disabled={busy} error={errors.name?.message} {...register("name")} />}
        <TextField label="이메일" id={`${id}-email`} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required disabled={busy} placeholder="name@example.com" error={errors.email?.message} {...register("email")} />
        <TextField label="비밀번호" id={`${id}-password`} type="password" autoComplete={signup ? "new-password" : "current-password"} required disabled={busy} error={errors.password?.message} {...register("password")} />
        {errors.root?.server?.message && <p ref={errorSummary} tabIndex={-1} role="alert" className="rounded-control border border-danger bg-danger-soft p-4 text-body">{errors.root.server.message}</p>}
        {completed && <p role="status" className="text-body">{signup ? "가입을 완료했습니다." : "로그인되었습니다."} 페이지를 이동합니다.</p>}
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded-control bg-primary px-4 py-3 text-body font-bold text-surface disabled:cursor-wait disabled:opacity-60">
          {busy ? (signup ? "가입 처리 중…" : "로그인 중…") : (signup ? "가입하기" : "로그인")}
        </button>
      </form>
      <p className="mt-6 text-center text-body text-muted">
        {signup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
        <Link href={signup ? loginHref(returnTo) : `/signup?${new URLSearchParams({ next: returnTo })}`} className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">
          {signup ? "로그인" : "회원가입"}
        </Link>
      </p>
    </section>
  );
}
