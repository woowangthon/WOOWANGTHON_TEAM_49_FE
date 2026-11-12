"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys } from "@/lib/query/business-keys";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { supportApi } from "./api";

export function safeWebsite(value?: string | null) {
  if (!value) return undefined;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
export function safePhone(value?: string | null) { return value && /^\+?[0-9][0-9 ()-]{2,24}$/.test(value) ? `tel:${value.replace(/[ ()-]/g, "")}` : undefined; }

export function CentersScreen() {
  const s = useSessionScope();
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [filters, setFilters] = useState({ region: "", category: "", page: 1 });
  const [search, setSearch] = useState("");
  const q = useQuery({ queryKey: [...businessKeys.root(s.generation), "consultation-centers", filters], enabled: s.enabled, queryFn: ({ signal }) => supportApi(s.api).centers(filters.region, filters.category, filters.page, signal) });
  const items = q.data?.items.filter(c => c.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div className="t7-support max-w-[760px] min-w-0 space-y-5 [overflow-wrap:anywhere]">
    <h1 className="text-[31px] font-extrabold">상담기관 찾기</h1><p>조회는 상담 예약·접수가 아닙니다. 연락 전 기관의 공식 정보를 확인하세요.</p>
    <form className={`${cardStyle} grid min-w-0 gap-4 sm:grid-cols-2`} onSubmit={e => { e.preventDefault(); setFilters({ region, category, page: 1 }); }}>
      <label>지역<input className="ui-control " placeholder="예: 청주시" value={region} onChange={e => setRegion(e.target.value)}/></label>
      <label>상담 분야<select aria-label="상담 분야" className="ui-control " value={category} onChange={e => setCategory(e.target.value)}><option value="">전체 분야</option><option value="WAGE">임금</option></select></label>
      <button className={secondaryButton} disabled={q.isFetching}>기관 조회</button>
    </form>
    <details className={cardStyle}><summary>이 페이지에서 기관명 찾기</summary><label className="block">현재 페이지 기관명 검색<input className="ui-control " value={search} onChange={e => setSearch(e.target.value)}/></label><p>이름 검색은 현재 조회 페이지에만 적용됩니다.</p></details>
    {q.isPending ? <QueryFeedback pending/> : q.isError ? <QueryFeedback error={q.error} retry={() => void q.refetch()}/> : <>
      {q.data.dataStatus === "NATIONWIDE_ONLY" && <p role="status">?? ?? ?? ???? ??? ?????.</p>}
      {q.data.nationwideFallbackUsed && <p role="status">지역 대신 전국 단위 대안을 표시합니다.</p>}
      {!items?.length && <p>표시할 상담기관이 없습니다. 지역·분야 또는 페이지 내 검색어를 바꿔 주세요.</p>}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">{items?.map(c => <article className={`${cardStyle} space-y-2`} key={c.centerId}><h2 className="font-bold">{c.name}</h2>{c.dataSource === "MOCK" && <p>개발용 예시 데이터 · 실제 기관·공식 확인 정보가 아닙니다.</p>}<p>{c.region} · {c.isNationwide === true ? "전국 단위" : c.isNationwide === false ? "지역 기관" : "범위 미제공"}</p><p>상담 분야: {c.categories.join(", ") || "미제공"}</p><p>연락처: {safePhone(c.phone) ? <a className="inline-flex min-h-11 items-center underline" href={safePhone(c.phone)}>{c.phone}</a> : "확인된 연락처 없음"}</p><p>홈페이지: {safeWebsite(c.website) ? <a className="inline-flex min-h-11 items-center underline" href={safeWebsite(c.website)} target="_blank" rel="noopener noreferrer">{c.website}</a> : "확인된 홈페이지 없음"}</p><p>공식 출처: {safeWebsite(c.sourceUrl) ? <a className="inline-flex min-h-11 items-center underline" href={safeWebsite(c.sourceUrl)} target="_blank" rel="noopener noreferrer">{c.sourceUrl}</a> : "미확인"}</p><p>검증일: {c.verifiedAt ?? "미확인"}</p></article>)}</div>
      <nav aria-label="상담기관 페이지" className="flex flex-wrap items-center gap-3"><button className={secondaryButton} disabled={filters.page === 1 || q.isFetching} onClick={() => setFilters(v => ({ ...v, page: v.page - 1 }))}>이전 페이지</button><span>{q.data.page} 페이지 · 전체 {q.data.total}개</span><button className={secondaryButton} disabled={q.isFetching || q.data.page * q.data.size >= q.data.total} onClick={() => setFilters(v => ({ ...v, page: v.page + 1 }))}>다음 페이지</button></nav>
    </>}
  </div>;
}
