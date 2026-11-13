"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesAuthFormErrors} from '../form-errors';
import {createLocalizedFeaturesAuthSchemas} from '../schemas';

import { useTranslation } from '@/i18n/use-translation';

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useId, useRef, useState } from "react";
import {useForm} from '@/i18n/use-localized-form';
import { z } from "zod";

import { TextField } from "@/components/ui/text-field";
import { useAppServices } from "@/hooks/use-app-services";
import { mockEnabled } from "@/lib/config/mock";

import {type AuthFormValues} from "../form-errors";
import { useAuth } from "../hooks/use-auth";
import { loginHref, safeReturnTo } from "../redirect";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
const {applyAuthError} = useLocalized(createLocalizedFeaturesAuthFormErrors);
const {loginRequestSchema, signupFormSchema} = useLocalized(createLocalizedFeaturesAuthSchemas);

 const {translate} = useTranslation();

  const signup = mode === "signup";
  const { auth, authApi } = useAppServices();
  const { notice } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("next"));
  const id = useId();
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const [completed, setCompleted] = useState(false);
  const schema = signup ? signupFormSchema : loginRequestSchema.extend({ name: z.string() });
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
    <section className="t8-auth-card" aria-labelledby={`${id}-title`}>
      <p className="mb-3 text-caption font-bold text-muted">{translate("auth.authForm_wage")}</p>
      <h1 id={`${id}-title`} className="text-[30px] font-extrabold tracking-tight">{signup ? translate("auth.authForm_signUp") : translate("auth.accountScreens_login")}</h1>
      {process.env.NODE_ENV === "development" && mockEnabled && <div className="mt-4 break-words rounded-control bg-amber-100 p-3 text-sm text-amber-950"><p>{translate("auth.authForm_example_authentication_privacy_input")}</p><p>{translate("auth.authForm_email")}</p><p>{translate("auth.authForm_password")}</p><p>{translate("auth.authForm_invalid_password_login_failure_email_registration_duplicate")}</p></div>}
      <p className="mt-3 text-body text-muted">{signup ? translate("auth.authForm_account_work_record") : translate("auth.authForm_monthlyWage_account_login")}</p>
      {!signup && params.get("registered") === "1" && <p role="status" className="mt-5 rounded-control bg-success-soft p-4 text-body">{translate("auth.authForm_signUp_complete_login")}</p>}
      {notice && <p role="status" className="mt-5 rounded-control bg-neutral-soft p-4 text-body">{notice}</p>}
      <form noValidate onSubmit={handleSubmit(submit)} aria-busy={busy} className="mt-8 space-y-5">
        {signup && <TextField label={translate("auth.accountScreens_name")} id={`${id}-name`} autoComplete="name" required disabled={busy} error={errors.name?.message} maxLength={100} {...register("name")} />}
        <TextField label={translate("auth.accountOverview_email")} id={`${id}-email`} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required disabled={busy} placeholder="name@example.com" error={errors.email?.message} maxLength={signup ? 254 : undefined} {...register("email")} />
        <TextField label={translate("auth.authForm_password_2")} id={`${id}-password`} type="password" autoComplete={signup ? "new-password" : "current-password"} required disabled={busy} error={errors.password?.message} minLength={signup ? 8 : undefined} maxLength={signup ? 128 : undefined} {...register("password")} />
        {errors.root?.server?.message && <p ref={errorSummary} tabIndex={-1} role="alert" className="rounded-control border border-danger bg-danger-soft p-4 text-body">{errors.root.server.message}</p>}
        {completed && <p role="status" className="text-body">{translate("auth.authForm_page_navigate", { value1: signup ? translate("auth.authForm_registration_complete") : translate("auth.authForm_login_2") })}</p>}
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded-control bg-primary px-4 py-3 text-body font-bold text-surface disabled:cursor-wait disabled:opacity-60">
          {busy ? (signup ? translate("auth.authForm_registration_processing") : translate("auth.authForm_login")) : (signup ? translate("auth.authForm_registration") : translate("auth.accountScreens_login"))}
        </button>
      </form>
      {!signup && <Link href="/forgot-password" className="inline-flex min-h-11 items-center underline">{translate("auth.accountScreens_password")}</Link>}
      <p className="mt-6 text-center text-body text-muted">
        {signup ? translate("auth.authForm_account") : translate("auth.authForm_account_none")}{" "}
        <Link href={signup ? loginHref(returnTo) : `/signup?${new URLSearchParams({ next: returnTo })}`} className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">
          {signup ? translate("auth.accountScreens_login") : translate("auth.authForm_signUp")}
        </Link>
      </p>
    </section>
  );
}
