"use client";
import {useMessageState} from "@/i18n/use-message-state";
import {message as describeMessage} from '@/i18n/message';

import {useLocalized} from '@/i18n/use-translation';
import type {Translation} from '@/i18n/translate';

import {createLocalizedFeaturesAuthSchemas} from '../schemas';
import {createLocalizedFeaturesAuthDeletion} from '../deletion';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {useForm} from '@/i18n/use-localized-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField } from "@/components/ui/text-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cardStyle, primaryButton, dangerButton } from "@/components/ui/styles";
import { useAppServices, useSessionGeneration } from "@/hooks/use-app-services";
import { ApiError } from "@/lib/api/error";
import { mockEnabled } from "@/lib/config/mock";
import { useCurrentUser } from "../hooks/use-auth";
import {forgotPasswordRequestSchema} from "../schemas";

const recoverySchema = z.object({ email: z.string().trim().pipe(forgotPasswordRequestSchema.shape.email), token: z.string(), newPassword: z.string(), confirm: z.string() });
export function RecoveryScreen({ reset = false }: { reset?: boolean }) {
const {errorText} = useLocalized(createPresentation);

const {resetPasswordRequestSchema} = useLocalized(createLocalizedFeaturesAuthSchemas);

 const {translate} = useTranslation();

  const { authApi, session } = useAppServices();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [mockToken, setMockToken] = useState("");
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const lock = useRef(false);
  const schema = reset ? recoverySchema.extend({ email: z.string(), ...resetPasswordRequestSchema.shape }).refine(v => v.newPassword === v.confirm, { path: ["confirm"], message: describeMessage("auth.accountScreens_password_match") }) : recoverySchema;
  const { register, handleSubmit, setValue, setError, resetField, formState: { errors, isSubmitting } } = useForm<z.infer<typeof recoverySchema>>({ resolver: zodResolver(schema), defaultValues: { email: "", token: "", newPassword: "", confirm: "" } });
  useEffect(() => {
    if (!isSubmitting && errors.root) errorSummary.current?.focus();
  }, [isSubmitting, errors.root]);
  useEffect(() => {
    if (!reset) return;
    const url = new URL(window.location.href);
    // Query-link convention is conditional: P0 does not specify the outbox link format.
    const token = url.searchParams.get("token");
    if (token) setValue("token", token);
    window.history.replaceState(window.history.state, "", url.pathname);
  }, [reset, setValue]);
  async function submit(values: z.infer<typeof recoverySchema>) {
    if (lock.current) return;
    lock.current = true;
    try {
      if (reset) {
        await authApi.resetPassword(values.token, values.newPassword);
        resetField("token"); resetField("newPassword"); resetField("confirm");
        session.clear(); router.replace("/login");
      } else { await authApi.forgotPassword(values.email); }
      setDone(true);
    } catch (error) { setError("root", { message: errorText(error, true) }); }
    finally { lock.current = false; }
  }
  return <section className="t8-auth-card"><h1 className="text-[30px] font-extrabold tracking-tight">{reset ? translate("auth.accountScreens_password_reset") : translate("auth.accountScreens_password")}</h1>
    <p className="mt-4">{translate("auth.accountScreens_current_email_confirm_token_use")}</p>
    <form noValidate onSubmit={(event) => { void handleSubmit(submit)(event); }} aria-busy={isSubmitting} className="mt-6 space-y-4">
      {reset ? <><TextField id="reset-token" label={translate("auth.accountScreens_reset_token")} type="password" autoComplete="off" required disabled={isSubmitting || done} error={errors.token?.message} minLength={20} maxLength={200} {...register("token")} />
      <TextField id="new-password" label={translate("auth.accountScreens_new_password")} type="password" autoComplete="new-password" required disabled={isSubmitting || done} error={errors.newPassword?.message} minLength={8} maxLength={128} {...register("newPassword")} />
      <TextField id="confirm-password" label={translate("auth.accountScreens_new_password_confirm")} type="password" autoComplete="new-password" required disabled={isSubmitting || done} error={errors.confirm?.message} maxLength={128} {...register("confirm")} /></> : <TextField id="recovery-email" label={translate("auth.accountOverview_email")} type="email" autoComplete="email" required disabled={isSubmitting || done} error={errors.email?.message} maxLength={254} {...register("email")} />}
      {errors.root && <p ref={errorSummary} tabIndex={-1} role="alert" className="rounded-control bg-danger-soft p-4">{errors.root.message}</p>}
      {done && <p role="status">{translate("auth.accountScreens_request_count_account_notice_password_reset_complete")}</p>}
      <button className={primaryButton} disabled={isSubmitting || done}>{isSubmitting ? translate("auth.accountScreens_processing") : reset ? translate("auth.accountScreens_password_reset") : translate("auth.accountScreens_request")}</button>
    </form>
    {process.env.NODE_ENV === "development" && mockEnabled && !reset && <button className={primaryButton + " mt-4"} onClick={async () => {
      const { readDevelopmentResetToken } = await import("@/mocks/development");
      const token = readDevelopmentResetToken();
      setMockToken(token);
    }}>{translate("auth.accountScreens_current_token_confirm")}</button>}
    {process.env.NODE_ENV === "development" && mockEnabled && mockToken && <TextField id="mock-reset-token" label={translate("auth.accountScreens_token_email_none")} value={mockToken} readOnly autoComplete="off" />}
    <div className="mt-6 flex flex-wrap gap-4"><Link className="min-h-11 underline" href="/login">{translate("auth.accountScreens_login")}</Link><Link className="min-h-11 underline" href={reset ? "/forgot-password" : "/reset-password"}>{reset ? translate("auth.accountScreens_new_token_request") : translate("auth.accountScreens_reset_token_input")}</Link></div>
  </section>;
}

export function SettingsScreen() {
const {errorText} = useLocalized(createPresentation);

 const {translate} = useTranslation();

  const user = useCurrentUser();
  const { authApi, auth } = useAppServices();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useMessageState("");
  const lock = useRef(false);
  async function remove() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await authApi.deleteAccount(); auth.acceptDeletion(); router.replace("/account-deletion"); }
    catch (error) { setError(errorText(error, true)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="min-w-0 max-w-[760px] space-y-6"><section className={cardStyle}><h1 className="text-2xl font-bold">{translate("auth.accountScreens_account_settings")}</h1>
    {user.isPending ? <p role="status">{translate("auth.accountScreens_account_information")}</p> : user.isError ? <><p role="alert">{errorText(user.error)}</p><button className={primaryButton} onClick={() => void user.refetch()}>{translate("common.retry")}</button></> : <dl className="mt-4 grid gap-3 divide-y divide-border [&_dt]:pt-3 [&_dt]:font-bold [&_dd]:pb-3"><dt>{translate("auth.accountScreens_name")}</dt><dd className="break-all">{user.data.name}</dd><dt>{translate("auth.accountOverview_email")}</dt><dd className="break-all">{user.data.email}</dd></dl>}
    <button className={primaryButton + " mt-4"} onClick={() => void auth.logout()}>{translate("auth.accountScreens_logout")}</button></section>
    <section className={`${cardStyle} border border-danger/40`}><p className="text-caption font-bold">{translate("auth.accountScreens_section6")}</p><h2 className="text-xl font-bold">{translate("auth.accountScreens_deletion")}</h2><p className="my-4">{translate("auth.accountScreens_count_all_record_access_workplace_case_original")}</p>
    <button className={dangerButton} onClick={() => setConfirm(true)}>{translate("auth.accountScreens_deletion_notice_confirm")}</button></section>
    {confirm && <ConfirmDialog title={translate("auth.accountScreens_deletion_request")} busy={busy} onClose={() => setConfirm(false)} action={<button className={dangerButton} disabled={busy} onClick={() => void remove()}>{translate("auth.accountScreens_deletion_request_confirm")}</button>}><p>{translate("auth.accountScreens_logout_account_record_access_count_none")}</p>{error && <p role="alert">{error}</p>}</ConfirmDialog>}
  </div>;
}
export function DeletionStatusScreen() {
const {errorText} = useLocalized(createPresentation);

const {deletionDescription, deletionPollInterval} = useLocalized(createLocalizedFeaturesAuthDeletion);

 const {translate} = useTranslation();

  const { authApi } = useAppServices();
  const generation = useSessionGeneration();
  const status = useQuery({ queryKey: ["account-deletion", generation], queryFn: ({ signal }) => authApi.deletionStatus(signal), retry: false,
    refetchOnWindowFocus: false, refetchInterval: query => deletionPollInterval(query.state.data, query.state.error) });
  return <section className={cardStyle}><h1 className="text-2xl font-bold">{translate("auth.accountScreens_account_delete_status_confirm")}</h1>
    <p className="my-4">{translate("auth.accountScreens_deletion_count_delete_complete")}</p>
    {status.isPending ? <p role="status">{translate("auth.accountScreens_count")}</p> : status.isError ? <p role="alert">{translate("auth.accountScreens_count_none_expired_automatic_stop", { value1: errorText(status.error) })}</p> : <><p role="status">{deletionDescription(status.data)}</p><dl><dt>{translate("auth.accountScreens_save")}</dt><dd>{status.data.normalStoragePurgeDueAt ?? translate("auth.accountScreens_notProvided")}</dd></dl><p>{translate("auth.accountScreens_automatic_current_response_contract_confirm_count_empty")}</p></>}
    <button className={primaryButton + " my-4"} disabled={status.isFetching} onClick={() => void status.refetch()}>{translate("auth.accountScreens_status_retry_confirm")}</button><p>{translate("auth.accountScreens_pending_status_automatic_complete_error_unknown_stop")}</p><Link className="inline-flex min-h-11 items-center underline" href="/login">{translate("auth.accountScreens_login_2")}</Link>
  </section>;
}

function createPresentation({translate}: Translation) {
function errorText(error: unknown, deferred = false) {
 const render = deferred ? describeMessage : translate;
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return render("auth.accountScreens_access_permission_none_authentication_expired");
    if (error.status === 409) return render("auth.accountScreens_current_status_request_count_empty_processing_confirm");
    if (error.status === 429) return render("auth.accountScreens_request_retry");
    if (error.status === 422 || error.status === 400) return render("auth.accountScreens_input_token_valid_expired_use_new");
  }
  return render("auth.accountScreens_request_complete_failure_link_confirm_retry");
}
return {errorText};
}
