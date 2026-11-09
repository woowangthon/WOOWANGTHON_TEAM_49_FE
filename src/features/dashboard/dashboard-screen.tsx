"use client";

import Link from "next/link";

import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { AccountOverview } from "@/features/auth/components/account-overview";
import { CaseCards } from "@/features/cases/components/case-cards";
import { useCases } from "@/features/cases/queries";
import { useWorkplaces } from "@/features/workplaces/queries";

export function DashboardScreen() {
  const workplaces = useWorkplaces();
  const cases = useCases();
  const recent = cases.data ? [...cases.data.items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 6) : undefined;
  const attention = cases.data?.items.filter((item) => item.attentionRequired === true);
  const knownAttention = cases.data?.items.filter((item) => item.attentionRequired !== undefined).length;
  return (
    <div className="space-y-8">
      <AccountOverview />
      <div className="flex flex-wrap gap-3"><Link href="/workplaces/new" className={secondaryButton}>근무지 등록</Link><Link href="/cases/new" className={primaryButton}>급여 사례 시작</Link></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <section className={cardStyle}><h2 className="text-body font-bold text-muted">전체 근무지</h2><p className="mt-3 text-3xl font-extrabold">{workplaces.data ? `${workplaces.data.total}개` : "—"}</p></section>
        <section className={cardStyle}><h2 className="text-body font-bold text-muted">전체 급여 사례</h2><p className="mt-3 text-3xl font-extrabold">{cases.data ? `${cases.data.total}개` : "—"}</p></section>
        <section className={cardStyle}><h2 className="text-body font-bold text-muted">조회한 사례 중 확인 필요</h2><p className="mt-3 text-3xl font-extrabold">{knownAttention ? `${attention?.length}개` : "정보 없음"}</p><p className="mt-3 text-caption text-muted">확인 필요 여부가 제공된 {knownAttention ?? 0}건 기준</p></section>
      </div>
      {workplaces.isPending ? <QueryFeedback pending /> : workplaces.isError ? <QueryFeedback error={workplaces.error} retry={() => { void workplaces.refetch(); }} /> : workplaces.data.total === 0 && <section className={cardStyle}><h2 className="text-title font-bold">첫 근무지를 등록해 주세요</h2><p className="my-4 text-body text-muted">근무지를 등록한 뒤 산정기간별 급여 사례를 시작할 수 있습니다.</p><Link href="/workplaces/new" className={primaryButton}>첫 근무지 등록</Link></section>}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-title font-extrabold">조회한 사례의 최근 업데이트</h2><Link href="/cases" className={secondaryButton}>모든 사례 보기</Link></div>
        <p className="text-caption text-muted">첫 페이지에 조회된 최대 20건 중 업데이트 순서입니다. 작업 완료 상태가 검사 일치를 뜻하지는 않습니다.</p>
        {cases.isPending ? <QueryFeedback pending /> : cases.isError ? <QueryFeedback error={cases.error} retry={() => { void cases.refetch(); }} /> : recent?.length ? <CaseCards items={recent} /> : <section className={cardStyle}><h3 className="text-title font-bold">아직 급여 사례가 없습니다</h3><p className="my-4 text-body text-muted">산정기간을 정해 내 급여 자료를 정리해 보세요.</p><Link href={workplaces.data?.total === 0 ? "/workplaces/new" : "/cases/new"} className={primaryButton}>첫 사례 준비하기</Link></section>}
      </section>
      {Boolean(attention?.length) && <section className="space-y-4"><h2 className="text-title font-extrabold">확인이 필요한 조회 사례</h2><CaseCards items={attention!} /></section>}
    </div>
  );
}
