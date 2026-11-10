"use client";

import Link from "next/link";

import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { caseCard } from "@/features/cases/view-models";
import { CaseCards, caseTaskHref } from "@/features/cases/components/case-cards";
import { useCases } from "@/features/cases/queries";
import { useWorkplaces } from "@/features/workplaces/queries";

export function DashboardScreen() {
  const workplaces = useWorkplaces();
  const cases = useCases();
  const sorted = cases.data ? [...cases.data.items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)) : undefined;
  const recent = sorted?.slice(0, 6);
  const attention = cases.data?.items.filter((item) => item.attentionRequired === true);
  const knownAttention = cases.data?.items.filter((item) => item.attentionRequired !== undefined).length;
  const current = sorted?.find(item => item.status === "IN_PROGRESS" || item.status === "CREATED");
  const card = current ? caseCard(current) : undefined;
  return (
    <div className="dashboard-screen min-w-0 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-caption font-bold text-muted">내 급여 검토 워크스페이스</p><h1 className="heading-dashboard font-extrabold">내 급여, 이어서 살펴볼까요</h1><p className="mt-3 text-body text-muted">현재 작업을 확인하고 필요한 자료를 차근차근 준비하세요.</p></div><Link href="/cases/new" className={primaryButton}>새 급여 검토</Link></header>
      {cases.isPending ? <QueryFeedback pending /> : cases.isError && <QueryFeedback error={cases.error} retry={() => { void cases.refetch(); }} />}
      <div className="dashboard-panels">
        <section className="dashboard-panel"><p className="text-caption font-bold text-muted">조회된 사례 중 최근 진행 사례</p><h2 className="mt-2 text-title font-extrabold">현재 검토</h2>{card ? <div className="mt-5 border-l-4 border-accent pl-4"><h3 className="text-title font-bold">{card.workplaceName}</h3><p className="mt-2 text-body">{card.period}</p><p className="my-3 text-caption">{card.status} · 현재 작업: {card.step}</p><Link href={caseTaskHref(current!)} className={primaryButton}>현재 사례 이어가기</Link><p className="mt-4 text-caption text-muted">작업 단계는 검사 완료나 결과 일치를 의미하지 않습니다.</p></div> : <p className="mt-5 text-body text-muted">{cases.data ? "조회 범위에 진행 중인 사례가 없습니다. 전체 목록을 확인하거나 새 검토를 시작하세요." : "사례를 조회하면 현재 작업을 확인할 수 있습니다."}</p>}</section>
        <section className="dashboard-panel"><h2 className="text-title font-extrabold">확인할 작업</h2><p className="my-3 text-caption text-muted">첫 페이지에서 확인 필요로 제공된 사례입니다. 최근 목록과 중복될 수 있습니다.</p>{attention?.length ? <CaseCards items={attention} compact /> : <p className="text-body text-muted">{knownAttention ? "조회 범위에 추가 확인 요청이 없습니다." : "확인 필요 정보가 제공되지 않았습니다."}</p>}</section>
      </div>

      <div className="dashboard-stats grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-panel border border-border bg-surface p-5"><h2 className="text-body font-bold text-muted">전체 근무지</h2><p className="mt-3 text-3xl font-extrabold">{workplaces.data ? `${workplaces.data.total}개` : "—"}</p></section>
        <section className="rounded-panel border border-border bg-surface p-5"><h2 className="text-body font-bold text-muted">전체 급여 사례</h2><p className="mt-3 text-3xl font-extrabold">{cases.data ? `${cases.data.total}개` : "—"}</p></section>
        <section className="rounded-panel border border-border bg-surface p-5"><h2 className="text-body font-bold text-muted">조회한 사례 중 확인 필요</h2><p className="mt-3 text-3xl font-extrabold">{knownAttention ? `${attention?.length}개` : "정보 없음"}</p><p className="mt-3 text-caption text-muted">확인 필요 여부가 제공된 {knownAttention ?? 0}건 기준</p></section>
      </div>
      {workplaces.isPending ? <QueryFeedback pending /> : workplaces.isError ? <QueryFeedback error={workplaces.error} retry={() => { void workplaces.refetch(); }} /> : workplaces.data.total === 0 && <section className={cardStyle}><h2 className="text-title font-bold">첫 근무지를 등록해 주세요</h2><p className="my-4 text-body text-muted">근무지를 등록한 뒤 산정기간별 급여 사례를 시작할 수 있습니다.</p><Link href="/workplaces/new" className={primaryButton}>첫 근무지 등록</Link></section>}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-title font-extrabold">조회한 사례의 최근 업데이트</h2><Link href="/cases" className={secondaryButton}>모든 사례 보기</Link></div>
        <p className="text-caption text-muted">첫 페이지에 조회된 최대 20건 중 업데이트 순서입니다. 작업 완료 상태가 검사 일치를 뜻하지는 않습니다.</p>
        {cases.isPending ? <QueryFeedback pending /> : !cases.data && cases.isError ? null : recent?.length ? <CaseCards items={recent} /> : <section className={cardStyle}><h3 className="text-title font-bold">아직 급여 사례가 없습니다</h3><p className="my-4 text-body text-muted">산정기간을 정해 내 급여 자료를 정리해 보세요.</p><Link href={workplaces.data?.total === 0 ? "/workplaces/new" : "/cases/new"} className={primaryButton}>첫 사례 준비하기</Link></section>}
      </section>
      <footer className="border-t border-border pt-4 text-caption text-muted"><Link href="/settings" className="inline-flex min-h-11 items-center underline">계정 설정</Link></footer>
    </div>
  );
}
