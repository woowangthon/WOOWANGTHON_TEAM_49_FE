"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, ChevronRight, ClipboardList, Files, FolderOpen, Plus } from "lucide-react";
import { useState } from "react";

import { QueryFeedback } from "@/components/ui/query-feedback";
import { CaseCards, caseTaskHref } from "@/features/cases/components/case-cards";
import { useCases } from "@/features/cases/queries";
import { caseCard } from "@/features/cases/view-models";
import { useWorkplaces } from "@/features/workplaces/queries";

import styles from "./dashboard.module.css";
import { WorkflowProgress } from "./workflow-progress";

export function DashboardScreen() {
  const [attentionLimit, setAttentionLimit] = useState(3);
  const workplaces = useWorkplaces();
  const cases = useCases();
  const sorted = cases.data
    ? [...cases.data.items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    : undefined;
  const recent = sorted?.slice(0, 6);
  const attention = cases.data?.items.filter((item) => item.attentionRequired === true);
  const knownAttention = cases.data?.items.filter((item) => item.attentionRequired !== undefined).length;
  const current = sorted?.find((item) => item.status === "IN_PROGRESS" || item.status === "CREATED");
  const card = current && caseCard(current);
  const firstWorkplace = workplaces.isSuccess && workplaces.data.total === 0;
  const showOnboarding = firstWorkplace && !current;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1>{current ? "내 급여, 이어서 살펴볼까요" : "내 급여 검토"}</h1>
        <Link href="/cases/new" className={styles.secondaryButton}>
          <Plus size={16} aria-hidden="true" />새 급여 검토
        </Link>
      </header>

      {cases.isPending && <QueryFeedback pending />}
      {cases.isError && <QueryFeedback error={cases.error} retry={() => void cases.refetch()} />}
      {workplaces.isPending && !cases.isPending && <QueryFeedback pending />}
      {workplaces.isError && <QueryFeedback error={workplaces.error} retry={() => void workplaces.refetch()} />}

      {showOnboarding && (
        <section className={styles.spotlight} aria-labelledby="first-workplace">
          <div className={styles.caseInfo}>
            <h2 id="first-workplace" className={styles.heroTitle}>첫 근무지를 등록해 주세요</h2>
            <p className={styles.heroDescription}>근무지를 등록한 뒤 산정기간별로 급여 자료를 모을 수 있어요.</p>
            <Link href="/workplaces/new" className={styles.primaryButton}>
              첫 근무지 등록 <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.emptyIllustration} aria-hidden="true"><Building2 strokeWidth={1.25} /></div>
        </section>
      )}

      {current && card ? (
        <section className={styles.spotlight} aria-labelledby="current-review">
          <div className={styles.caseInfo}>
            <h2 id="current-review" className={styles.heroLabel}>
              <FolderOpen size={18} aria-hidden="true" />현재 검토
            </h2>
            <h3 className={styles.heroTitle}>{card.workplaceName}</h3>
            <p className={styles.period}><CalendarDays size={16} aria-hidden="true" />{card.period}</p>
            <p className={styles.caseStatus}><strong>{card.status}</strong><span>{card.payType}</span></p>
            <Link href={caseTaskHref(current)} className={styles.primaryButton}>
              현재 내역 이어가기 <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.stepsPanel}>
            <p className={styles.stepHeading}>검토 단계</p>
            <WorkflowProgress item={current} />
            <p className={styles.stepNote}>작업 단계는 검사 완료나 결과 일치를 의미하지 않습니다.</p>
          </div>
        </section>
      ) : cases.data && workplaces.isSuccess && !firstWorkplace && (
        <section className={styles.quietPanel}>
          <h2>현재 검토</h2>
          <p>조회 범위에 진행 중인 내역이 없습니다.</p>
        </section>
      )}

      <div className={styles.overview}>
        <section className={styles.panel} aria-labelledby="attention-heading">
          <div className={styles.sectionHead}>
            <h2 id="attention-heading">확인할 작업</h2>
            {!!attention?.length && <span className={styles.attentionCount}>{attention.length}건</span>}
          </div>
          {attention?.length ? (
            <div className={styles.attentionList}>
              <CaseCards items={attention.slice(0, attentionLimit)} compact />
              {attentionLimit < attention.length && (
                <button type="button" className={styles.more} onClick={() => setAttentionLimit(n => n + 3)}>
                  더 보기 ({Math.min(attentionLimit, attention.length)}/{attention.length})
                </button>
              )}
            </div>
          ) : cases.data && (
            <p className={styles.emptyNote}>
              {knownAttention ? "조회 범위에 추가 확인 요청이 없습니다." : "확인 필요 정보가 제공되지 않았습니다."}
            </p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="overview-heading">
          <h2 id="overview-heading">검토 현황</h2>
          <div className={styles.stat}>
            <Building2 aria-hidden="true" /><h3>전체 근무지</h3>
            <strong>{workplaces.data ? `${workplaces.data.total}개` : "—"}</strong>
          </div>
          <div className={styles.stat}>
            <Files aria-hidden="true" /><h3>전체 급여 내역</h3>
            <strong>{cases.data ? `${cases.data.total}개` : "—"}</strong>
          </div>
          <div className={styles.stat}>
            <ClipboardList aria-hidden="true" /><h3>조회한 내역 중 확인 필요</h3>
            <strong>{knownAttention ? `${attention?.length}개` : "정보 없음"}</strong>
          </div>
          {cases.data && <p className={styles.note}>확인 필요 여부가 제공된 {knownAttention}건 기준</p>}
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="recent-heading">
        <div className={styles.sectionHead}>
          <h2 id="recent-heading">최근 업데이트한 내역</h2>
          <Link href="/cases" className={styles.textLink}>모든 내역 보기 <ChevronRight size={16} aria-hidden="true" /></Link>
        </div>
        {recent?.length ? (
          <div className={styles.recentList}><CaseCards items={recent} /></div>
        ) : cases.data && (
          <div className={styles.quietPanel}>
            <h3>아직 급여 내역이 없습니다</h3>
            <p>산정기간을 정해 급여 자료를 모아 보세요.</p>
            <Link href={workplaces.data?.total === 0 ? "/workplaces/new" : "/cases/new"} className={styles.textLink}>
              첫 내역 준비하기 <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
        <details className={styles.scope}>
          <summary>목록과 통계의 조회 범위</summary>
          <p>첫 페이지에 조회된 최대 20건 중 업데이트 순서입니다. 확인할 작업과 최근 목록에는 같은 내역이 표시될 수 있습니다.</p>
          <p>전체 근무지와 전체 내역 수는 서버에서 제공한 총계입니다. 작업 완료 상태가 검사 일치를 뜻하지는 않습니다.</p>
        </details>
      </section>
      <footer><Link href="/settings" className={styles.textLink}>계정 설정 <ChevronRight size={15} aria-hidden="true" /></Link></footer>
    </div>
  );
}
