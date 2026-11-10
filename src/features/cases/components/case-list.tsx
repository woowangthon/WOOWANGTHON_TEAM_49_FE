"use client";

import Link from "next/link";
import { useState } from "react";

import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton } from "@/components/ui/styles";

import { useCases } from "../queries";
import { CaseCards } from "./case-cards";

export function CaseList({ workplaceId }: { workplaceId?: number }) {
  const [page, setPage] = useState(1);
  const query = useCases(page, 20, workplaceId);
  const createHref = workplaceId === undefined ? "/cases/new" : `/cases/new?workplaceId=${workplaceId}`;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError && !query.data) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  return (
    <section className="min-w-0 space-y-4" aria-label="급여 사례 목록">
      {query.isError && <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />}
      {query.data!.items.length === 0 ? <div className={cardStyle}><h2 className="text-title font-bold">등록된 급여 사례가 없습니다</h2><p className="my-4 text-body text-muted">근무지와 산정기간을 선택해 첫 사례를 시작하세요.</p><Link href={createHref} className={primaryButton}>사례 시작하기</Link></div> : <CaseCards items={query.data!.items} />}
      <Pagination page={query.data!.page} size={query.data!.size} total={query.data!.total} onPage={setPage} busy={query.isFetching} />
    </section>
  );
}
