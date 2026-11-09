"use client";

import { StatePanel } from "@/components/ui/state-panel";

import { useCurrentUser } from "../hooks/use-auth";

/** Current user data is provided by the existing auth Query cache. */
export function AccountOverview() {
  const user = useCurrentUser();
  if (user.isPending) return <StatePanel title="내 정보를 불러오는 중입니다" description="잠시만 기다려 주세요." live />;
  if (user.isError) return <StatePanel title="내 정보를 불러오지 못했습니다" description="연결을 확인하고 다시 시도해 주세요." action={<button type="button" onClick={() => { void user.refetch(); }} className="min-h-11 rounded-control bg-primary px-4 py-3 text-body font-bold text-surface">다시 시도</button>} />;

  return (
    <section className="max-w-2xl rounded-card bg-surface p-6 shadow-card sm:p-8">
      <p className="text-caption font-bold text-muted">내 급여 자료 한눈에 보기</p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{user.data.name}님, 반갑습니다</h1>
      <dl className="mt-6 grid min-w-0 gap-2 text-body">
        <dt className="font-bold">이메일</dt><dd className="min-w-0 break-all text-muted">{user.data.email}</dd>
      </dl>
      <p className="mt-6 text-body text-muted">근무지와 산정기간별 사례를 확인하고 필요한 자료를 차근차근 준비하세요.</p>
    </section>
  );
}
