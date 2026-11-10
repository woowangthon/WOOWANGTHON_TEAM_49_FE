"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";

import { useWorkplaces } from "../queries";
import { workplaceCard } from "../view-models";

export function WorkplaceListScreen() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const id = useId();
  const query = useWorkplaces(page);
  const items = query.data?.items.filter((item) => [item.name, item.industry, item.region].some((value) => value?.toLocaleLowerCase("ko").includes(search.trim().toLocaleLowerCase("ko"))));
  return (
    <div className="space-y-6">
      <PageHeading title="내 근무지" description="근무지별로 급여 산정 사례와 자료를 정리하세요." action={<Link href="/workplaces/new" className={primaryButton}>근무지 등록</Link>} />
      <div className="max-w-xl"><TextField id={id} type="search" label="현재 페이지에서 검색" placeholder="사업장명, 업종, 지역" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
        {items?.length ? <ul className="workspace-card-list grid min-w-0 gap-4">{items.map((dto) => {
          const item = workplaceCard(dto);
          return <li key={item.id} className={cardStyle}><p className="mb-3 text-caption font-bold text-muted">{item.employment}</p><h2 className="text-title font-extrabold"><Link href={`/workplaces/${item.id}`} className="inline-flex min-h-11 min-w-11 items-center underline decoration-border underline-offset-4">{item.name}</Link></h2><p className="mt-3 text-body text-muted">{item.industry} · {item.region}</p><p className="mt-4 text-body">급여 사례 {item.caseCount}개</p></li>;
        })}</ul> : <section className={cardStyle}><h2 className="text-title font-bold">{search ? "현재 페이지에 검색 결과가 없습니다" : "등록된 근무지가 없습니다"}</h2><p className="mt-3 text-body text-muted">{search ? "검색어를 바꾸거나 다른 페이지를 확인해 주세요." : "첫 근무지를 등록하고 급여 사례를 시작하세요."}</p></section>}
        <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={(next) => { setPage(next); setSearch(""); }} />
      </>}
    </div>
  );
}
