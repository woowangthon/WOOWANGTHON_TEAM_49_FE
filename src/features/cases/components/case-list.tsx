"use client";

import Link from "next/link";
import { Check, FileText, FolderOpen, Info, Plus } from "lucide-react";
import { useState } from "react";

import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton } from "@/components/ui/styles";

import { useCases } from "../queries";
import { CaseCards } from "./case-cards";
import styles from "./case-explorer.module.css";

export function CaseList({ workplaceId }: { workplaceId?: number }) {
  const [page, setPage] = useState(1);
  const query = useCases(page, 20, workplaceId);
  const createHref = workplaceId === undefined ? "/cases/new" : `/cases/new?workplaceId=${workplaceId}`;
  const standalone = workplaceId === undefined;
  const data = query.data;
  return (
    <section className={standalone ? styles.explorer : "min-w-0 space-y-4"} aria-label="급여 사례 목록">
      {standalone && (
        <header className={styles.header}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" />나의 급여 기록</p>
            <h1>급여 사례 탐색</h1>
            <p className={styles.intro}>흩어진 급여 기록을 한곳에.<br />하던 검토를 가볍게 이어가세요.</p>
            {(!data || data.total > 0) && (
              <Link href={createHref} className={styles.heroCreate}><Plus size={18} aria-hidden="true" />새 사례 시작</Link>
            )}
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.artHalo} />
            <div className={styles.paperBack} />
            <div className={styles.paper}>
              <span className={styles.paperIcon}><FileText size={28} strokeWidth={1.8} /></span>
              <span className={styles.paperTitle}>나의 급여 기록</span>
              <div className={styles.paperLines}><i /><i /><i /></div>
              <div className={styles.paperBottom}><span /><span /></div>
            </div>
            <span className={styles.artCheck}><Check size={34} strokeWidth={3} /></span>
            <span className={styles.artCoin}>₩</span>
            <span className={styles.artSparkle}>+</span>
            <span className={styles.artDot} />
          </div>
        </header>
      )}
      {query.isPending && <div className={standalone ? styles.feedback : undefined}><QueryFeedback pending /></div>}
      {query.isError && <div className={standalone ? styles.feedback : undefined}><QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /></div>}
      {data && (
        <div className={standalone ? styles.panel : "space-y-4"}>
          {standalone && (
            <div className={styles.listHeading}>
              <h2>전체 사례 <span>{data.total.toLocaleString("ko-KR")}건</span></h2>
              <p>살펴볼 사례를 선택해 주세요</p>
            </div>
          )}
          {standalone && data.items.length === 0 && data.total > 0 ? (
            <p className={styles.empty}>이 페이지에는 표시할 사례가 없어요.</p>
          ) : data.items.length === 0 ? (
            <div className={standalone ? styles.empty : cardStyle}>
              {standalone && <span className={styles.emptyIcon}><FolderOpen aria-hidden="true" size={30} strokeWidth={1.7} /></span>}
              <h2 className="text-title font-bold">등록된 급여 사례가 없습니다</h2>
              <p className="my-4 text-body text-muted">근무지와 산정기간을 선택해 첫 사례를 시작하세요.</p>
              <Link href={createHref} className={standalone ? styles.create : primaryButton}>사례 시작하기</Link>
            </div>
          ) : <CaseCards items={data.items} variant={standalone ? "explorer" : "workplace"} />}
          {(standalone ? data.total > 0 || data.page > 1 : data.total > data.size || data.page > 1) && (
            <Pagination page={data.page} size={data.size} total={data.total} onPage={setPage} busy={query.isFetching} />
          )}
        </div>
      )}
      {standalone && data && data.total > 0 && (
        <p className={styles.note}><Info size={16} aria-hidden="true" />사례 상태는 검토 진행 상황을 나타내요.</p>
      )}
    </section>
  );
}
