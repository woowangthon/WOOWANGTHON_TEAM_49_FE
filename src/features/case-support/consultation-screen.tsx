"use client";

import Link from "next/link";
import { useState } from "react";
import { useCases } from "@/features/cases/queries";
import { caseCard } from "@/features/cases/view-models";
import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { SupportLinks } from "./screens";

export function ConsultationScreen() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number>();
  const query = useCases(page);
  const choice = query.data?.items.find(item => item.caseId === selected);
  return <div className="space-y-6">
    <PageHeading title="상담 준비" description="상담할 급여 사례를 직접 선택해 주세요. 사례별 질문과 문의 초안, 다운로드할 자료를 확인할 수 있어요." />
    <Link className={secondaryButton} href="/consultation-centers">상담기관 찾기</Link>
    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => void query.refetch()} /> : <>
      <fieldset className={`${cardStyle} space-y-3`}><legend>상담할 급여 사례 선택</legend>
        {!query.data.items.length && <p>등록된 사례가 없습니다. <Link href="/cases/new" className="underline">새 급여 사례 시작</Link></p>}
        {query.data.items.map(dto => { const item = caseCard(dto); return <label key={dto.caseId} className="flex min-h-11 items-center gap-3 border-b border-border py-3"><input type="radio" name="consultation-case" checked={selected === dto.caseId} onChange={() => setSelected(dto.caseId)} /><span>{item.workplaceName} · {item.period} · {item.payType} · 사례 #{dto.caseId}</span></label>; })}
        <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={next => { setPage(next); setSelected(undefined); }} />
      </fieldset>
      {choice && <section className={`${cardStyle} space-y-4`} aria-label="선택한 사례의 상담 준비"><h2 className="font-bold">{caseCard(choice).workplaceName} · {caseCard(choice).period}</h2><SupportLinks caseId={choice.caseId} /></section>}
    </>}
  </div>;
}
