"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField } from "@/components/ui/text-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cardStyle, primaryButton, dangerButton } from "@/components/ui/styles";
import { useAppServices, useSessionGeneration } from "@/hooks/use-app-services";
import { ApiError } from "@/lib/api/error";
import { mockEnabled } from "@/lib/config/mock";
import { useCurrentUser } from "../hooks/use-auth";
import { forgotPasswordRequestSchema, resetPasswordRequestSchema } from "../schemas";
import { deletionDescription, deletionPollInterval } from "../deletion";

function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "접근 권한이 없거나 인증이 만료되었습니다.";
    if (error.status === 409) return "현재 상태에서는 요청할 수 없습니다. 이미 처리된 요청인지 확인해 주세요.";
    if (error.status === 429) return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    if (error.status === 422 || error.status === 400) return "입력 또는 토큰이 유효하지 않습니다. 만료·사용된 토큰은 새로 발급받아 주세요.";
  }
  return "요청을 완료하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.";
}
const recoverySchema = z.object({ email: z.string().trim().pipe(forgotPasswordRequestSchema.shape.email), token: z.string(), newPassword: z.string(), confirm: z.string() });
export function RecoveryScreen({ reset = false }: { reset?: boolean }) {
  const { authApi, session } = useAppServices();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [mockToken, setMockToken] = useState("");
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const lock = useRef(false);
  const schema = reset ? recoverySchema.extend({ email: z.string(), ...resetPasswordRequestSchema.shape }).refine(v => v.newPassword === v.confirm, { path: ["confirm"], message: "비밀번호가 일치하지 않습니다." }) : recoverySchema;
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
    } catch (error) { setError("root", { message: errorText(error) }); }
    finally { lock.current = false; }
  }
  return <section className="t8-auth-card"><h1 className="text-[30px] font-extrabold tracking-tight">{reset ? "비밀번호 재설정" : "비밀번호 찾기"}</h1>
    <p className="mt-4">현재 복구 방식은 로컬 outbox 전용이며 실제 이메일을 발송하지 않습니다. 개발자가 확인한 토큰을 사용하세요.</p>
    <form noValidate onSubmit={(event) => { void handleSubmit(submit)(event); }} aria-busy={isSubmitting} className="mt-6 space-y-4">
      {reset ? <><TextField id="reset-token" label="재설정 토큰" type="password" autoComplete="off" required disabled={isSubmitting || done} error={errors.token?.message} minLength={20} maxLength={200} {...register("token")} />
      <TextField id="new-password" label="새 비밀번호" type="password" autoComplete="new-password" required disabled={isSubmitting || done} error={errors.newPassword?.message} minLength={8} maxLength={128} {...register("newPassword")} />
      <TextField id="confirm-password" label="새 비밀번호 확인" type="password" autoComplete="new-password" required disabled={isSubmitting || done} error={errors.confirm?.message} maxLength={128} {...register("confirm")} /></> : <TextField id="recovery-email" label="이메일" type="email" autoComplete="email" required disabled={isSubmitting || done} error={errors.email?.message} maxLength={254} {...register("email")} />}
      {errors.root && <p ref={errorSummary} tabIndex={-1} role="alert" className="rounded-control bg-danger-soft p-4">{errors.root.message}</p>}
      {done && <p role="status">요청을 접수했습니다. 계정 존재 여부는 안내하지 않습니다. 비밀번호는 재설정을 완료해야 변경됩니다.</p>}
      <button className={primaryButton} disabled={isSubmitting || done}>{isSubmitting ? "처리 중…" : reset ? "비밀번호 재설정" : "복구 요청"}</button>
    </form>
    {process.env.NODE_ENV === "development" && mockEnabled && !reset && <button className={primaryButton + " mt-4"} onClick={async () => {
      const { readDevelopmentResetToken } = await import("@/mocks/development");
      const token = readDevelopmentResetToken();
      setMockToken(token);
    }}>개발용 최신 Mock 토큰 확인</button>}
    {process.env.NODE_ENV === "development" && mockEnabled && mockToken && <TextField id="mock-reset-token" label="개발용 Mock 토큰 (실제 이메일 발송 없음)" value={mockToken} readOnly autoComplete="off" />}
    <div className="mt-6 flex flex-wrap gap-4"><Link className="min-h-11 underline" href="/login">로그인</Link><Link className="min-h-11 underline" href={reset ? "/forgot-password" : "/reset-password"}>{reset ? "새 토큰 요청" : "재설정 토큰 입력"}</Link></div>
  </section>;
}

export function SettingsScreen() {
  const user = useCurrentUser();
  const { authApi, auth } = useAppServices();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function remove() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await authApi.deleteAccount(); auth.acceptDeletion(); router.replace("/account-deletion"); }
    catch (error) { setError(errorText(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="min-w-0 max-w-[760px] space-y-6"><section className={cardStyle}><h1 className="text-2xl font-bold">계정 설정</h1>
    {user.isPending ? <p role="status">계정 정보 조회 중…</p> : user.isError ? <><p role="alert">{errorText(user.error)}</p><button className={primaryButton} onClick={() => void user.refetch()}>다시 시도</button></> : <dl className="mt-4 grid gap-3 divide-y divide-border [&_dt]:pt-3 [&_dt]:font-bold [&_dd]:pb-3"><dt>이름</dt><dd className="break-all">{user.data.name}</dd><dt>이메일</dt><dd className="break-all">{user.data.email}</dd></dl>}
    <button className={primaryButton + " mt-4"} onClick={() => void auth.logout()}>로그아웃</button></section>
    <section className={`${cardStyle} border border-danger/40`}><p className="text-caption font-bold">위험한 작업</p><h2 className="text-xl font-bold">회원 탈퇴</h2><p className="my-4">접수 후 모든 기존 세션이 무효화되고 자료 접근이 차단됩니다. 근무지, 내역, 원본 문서, 보고서, AI 대화 등 연결 자료에 영향을 줍니다. 요청 접수는 파기 완료를 뜻하지 않습니다. 파기 일정과 보존 범위는 확인이 필요합니다.</p>
    <button className={dangerButton} onClick={() => setConfirm(true)}>회원 탈퇴 안내 및 확인</button></section>
    {confirm && <ConfirmDialog title="회원 탈퇴를 요청할까요?" busy={busy} onClose={() => setConfirm(false)} action={<button className={dangerButton} disabled={busy} onClick={() => void remove()}>탈퇴 요청 확인</button>}><p>일반 로그아웃과 다릅니다. 계정 자료에 접근할 수 없게 됩니다.</p>{error && <p role="alert">{error}</p>}</ConfirmDialog>}
  </div>;
}
export function DeletionStatusScreen() {
  const { authApi } = useAppServices();
  const generation = useSessionGeneration();
  const status = useQuery({ queryKey: ["account-deletion", generation], queryFn: ({ signal }) => authApi.deletionStatus(signal), retry: false,
    refetchOnWindowFocus: false, refetchInterval: query => deletionPollInterval(query.state.data, query.state.error) });
  return <section className={cardStyle}><h1 className="text-2xl font-bold">계정 삭제 상태 확인</h1>
    <p className="my-4">탈퇴 접수와 데이터 삭제 완료는 다릅니다.</p>
    {status.isPending ? <p role="status">영수증 쿠키로 조회 중…</p> : status.isError ? <p role="alert">{errorText(status.error)} 영수증이 없거나 만료되었을 수 있습니다. 자동 조회를 중단했습니다.</p> : <><p role="status">{deletionDescription(status.data)}</p><dl><dt>일반 저장소 파기 예정일</dt><dd>{status.data.normalStoragePurgeDueAt ?? "미정 또는 미제공"}</dd></dl><p>자동 물리 파기 구현 여부는 현재 응답 계약으로 확인할 수 없습니다.</p></>}
    <button className={primaryButton + " my-4"} disabled={status.isFetching} onClick={() => void status.refetch()}>상태 다시 확인</button><p>파기 대기 상태만 자동 조회하며, 완료·보존 보류·오류·알 수 없는 상태에서는 중단합니다.</p><Link className="inline-flex min-h-11 items-center underline" href="/login">로그인 화면</Link>
  </section>;
}
