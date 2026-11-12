"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ArrowRight, Building2, MapPin, Plus, Search } from "lucide-react";

import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

import { useWorkplaces } from "../queries";
import { workplaceCard } from "../view-models";
import styles from "./workplace-list.module.css";

export function WorkplaceListScreen() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const query = useWorkplaces(page);
  const hasSearch = search.trim().length > 0;
  const items = query.data?.items.filter((item) => [item.name, item.industry, item.region].some((value) => value?.toLocaleLowerCase("ko").includes(search.trim().toLocaleLowerCase("ko"))));
  const empty = query.isSuccess && query.data.total === 0;
  const clearSearch = () => { setSearch(""); searchInput.current?.focus(); };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span aria-hidden="true" />나의 일터, 나의 급여</p>
          <h1>내 근무지</h1>
          <p className={styles.intro}>일한 곳마다 급여 기록을 차곡차곡.<br />확인할 근무지를 선택해 주세요.</p>
          {!empty && <Link href="/workplaces/new" className={styles.register}><Plus size={18} aria-hidden="true" />근무지 등록</Link>}
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.artHalo} />
          <div className={styles.buildingBack} />
          <div className={styles.building}>
            <span className={styles.buildingSign}><Building2 size={22} strokeWidth={1.8} />MY WORK</span>
            <div className={styles.windows}>{Array.from({length: 6}, (_, index) => <i key={index} />)}</div>
            <div className={styles.door} />
          </div>
          <span className={styles.artPin}><MapPin size={33} strokeWidth={2.3} /></span>
          <span className={styles.artCoin}>₩</span>
          <span className={styles.artSparkle}>+</span>
        </div>
      </header>

      {query.isPending ? <div className={styles.feedback}><QueryFeedback pending /></div> : query.isError ? <div className={styles.feedback}><QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /></div> : empty ? (
        <section className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true"><Building2 size={30} strokeWidth={1.6} /></span>
          <h2>첫 근무지를 등록해 주세요</h2>
          <p>일한 곳을 등록하고, 확인할 급여 기간과 자료를 모아 보세요.</p>
          <Link href="/workplaces/new" className={primaryButton}><Plus size={18} aria-hidden="true" />근무지 등록</Link>
        </section>
      ) : (
        <section aria-labelledby={`${id}-list-title`} className={styles.panel}>
          <div className={styles.listHead}>
            <h2 id={`${id}-list-title`}>등록한 근무지 <span>{query.data.total}곳</span></h2>
            <div className={styles.search}>
              <label htmlFor={`${id}-search`}>현재 페이지에서 검색</label>
              <div className={styles.searchControl}>
                <Search size={18} aria-hidden="true" />
                <input ref={searchInput} id={`${id}-search`} type="search" placeholder="사업장명, 업종, 지역" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
          </div>
          {hasSearch && <div className={styles.searchStatus}><p role="status">현재 페이지에서 {items?.length ?? 0}곳을 찾았어요</p><button type="button" onClick={clearSearch}>검색 초기화</button></div>}

          {items?.length ? <ul className={styles.list}>{items.map((dto) => {
            const item = workplaceCard(dto);
            const hasCases = item.caseCount > 0;
            const titleId = `${id}-${item.id}-name`;
            const actionId = `${id}-${item.id}-action`;
            return <li key={item.id} className={styles.item}>
              <Link href={hasCases ? `/workplaces/${item.id}` : `/cases/new?workplaceId=${item.id}`} className={styles.card} aria-labelledby={titleId} aria-describedby={actionId}>
                <div className={styles.cardTop}><span className={styles.placeIcon} aria-hidden="true"><Building2 size={26} strokeWidth={1.7} /></span><span className={styles.badge} data-employment={dto.employmentStatus}>{item.employment}</span></div>
                <div className={styles.identity}>
                  <div className={styles.titleRow}><h3 id={titleId}>{item.name}</h3></div>
                  <p className={styles.meta}><MapPin size={14} aria-hidden="true" /><span>{item.region} · {item.industry}</span></p>
                </div>
                <span id={actionId} className={styles.action}>{hasCases ? <>급여 사례 <strong>{item.caseCount}개</strong> 보기</> : "첫 급여 사례 만들기"}<ArrowRight size={18} aria-hidden="true" /></span>
              </Link>
              {!hasCases && <div className={styles.cardFoot}><p>아직 등록한 급여 사례가 없어요</p><Link href={`/workplaces/${item.id}`} aria-label={`${item.name} 근무지 정보`}>근무지 정보</Link></div>}
            </li>;
          })}</ul> : <div className={styles.noResults}><Search size={28} aria-hidden="true" /><h3>현재 페이지에 검색 결과가 없습니다</h3><p>검색어를 바꾸거나 다른 페이지를 확인해 주세요.</p><button type="button" className={secondaryButton} onClick={clearSearch}>현재 페이지 전체 보기</button></div>}

          {query.data.total > query.data.size && <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={(next) => { setPage(next); setSearch(""); }} />}
        </section>
      )}
      {!empty && query.isSuccess && <p className={styles.note}>퇴사한 근무지의 급여도 계속 확인할 수 있어요.</p>}
    </div>
  );
}
