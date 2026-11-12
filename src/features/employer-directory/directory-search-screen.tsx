"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { DirectoryUnavailable, DisclosureBadge, ExampleNotice, SourceLink } from "./directory-shared";
import { directoryHref, filterEmployers, industries, pageSize, parseDirectoryFilters, regions, type DirectoryFilters } from "./models";
import { useEmployerDirectory } from "./queries";
import styles from "./directory.module.css";

export function DirectorySearchScreen({ filters }: { filters: DirectoryFilters }) {
  const query = useEmployerDirectory();
  const router = useRouter();
  const items = filterEmployers(query.data?.items ?? [], filters);
  const lastPage = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(filters.page, lastPage);
  const visible = items.slice((page - 1) * pageSize, page * pageSize);
  const activeFilters = Boolean(filters.q || filters.region || filters.industry);

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    router.push(directoryHref(parseDirectoryFilters({
      q: String(form.get("q") ?? ""), region: String(form.get("region") ?? ""), industry: String(form.get("industry") ?? ""),
    })));
  }

  return <div className={styles.screen}>
    <header className={styles.heading}>
      <p className={styles.eyebrow}>사업장 찾기</p>
      <h1>내가 일하는 곳,<br />먼저 살펴보세요</h1>
      <p className={styles.description}>공장등록 정보와 공식 공표자료를 한곳에서 확인해요.</p>
    </header>
    {query.data?.example && <ExampleNotice />}
    <form className={styles.searchPanel} onSubmit={search} key={JSON.stringify(filters)} role="search" aria-label="사업장 검색">
      <label htmlFor="employer-search">사업장명 또는 주소</label>
      <div className={styles.searchInput}>
        <Search size={21} aria-hidden="true" />
        <input id="employer-search" name="q" type="search" defaultValue={filters.q} maxLength={100} placeholder="회사 이름이나 주소를 입력해 주세요" />
        <button className={styles.searchButton} type="submit">검색</button>
      </div>
      <div className={styles.filters}>
        <label>지역<select name="region" defaultValue={filters.region}>
          <option value="">전체 지역</option>{regions.map(region => <option key={region}>{region}</option>)}
        </select></label>
        <label>업종<select name="industry" defaultValue={filters.industry}>
          <option value="">전체 업종</option>{industries.map(industry => <option key={industry}>{industry}</option>)}
        </select></label>
      </div>
    </form>
    {query.isPending && <QueryFeedback pending />}
    {query.isError && <QueryFeedback error={query.error} retry={() => void query.refetch()} />}
    {query.data && !query.data.example && <DirectoryUnavailable />}
    {query.data?.example && <section className={styles.results} aria-labelledby="directory-results">
      <div className={styles.sectionHeading}>
        <h2 id="directory-results">검색 결과 <span>{items.length}곳</span></h2>
        {activeFilters && <Link href="/employers" className={styles.textLink}>조건 초기화</Link>}
      </div>
      <p className={styles.resultNote}>외국인 종업원 수는 등록자료 기준이에요. 현재 근무 인원과 다를 수 있어요.</p>
      {visible.length ? <ul className={styles.resultList}>
        {visible.map(item => <li key={item.id}>
          <Link className={styles.resultRow} href={`/employers/${item.id}?${new URLSearchParams({ from: directoryHref(filters, page) })}`}>
            <span className={styles.companyIcon} aria-hidden="true"><Building2 size={23} /></span>
            <div className={styles.companyInfo}>
              <h3>{item.name}</h3>
              <p>{item.region}<span aria-hidden="true"> · </span>{item.industry}</p>
              <p className={styles.address}>{item.address}</p>
              <p className={styles.workerCount}><Users size={15} aria-hidden="true" />등록자료상 외국인 <strong>{item.foreignEmployees ?? "정보 없음"}</strong></p>
              <p className={styles.referenceDate}>자료 기준 {item.referenceDate}</p>
            </div>
            <div className={styles.rowDisclosure}>
              <span>임금체불 명단공개</span><DisclosureBadge value={item.wageDisclosure} wage />
            </div>
            <ChevronRight className={styles.rowChevron} size={20} aria-hidden="true" />
          </Link>
        </li>)}
      </ul> : <div className={styles.empty}>
        <Search size={30} aria-hidden="true" /><h3>조건에 맞는 사업장이 없어요</h3>
        <p>지역·업종을 넓히거나 회사 이름을 짧게 검색해 보세요.</p>
        <Link className={styles.textLink} href="/employers">전체 예시 사업장 보기</Link>
      </div>}
      {lastPage > 1 && <nav className={styles.pagination} aria-label="사업장 검색 페이지 이동">
        {page > 1 ? <Link href={directoryHref(filters, page - 1)}><ChevronLeft size={17} aria-hidden="true" />이전</Link> : <span aria-disabled="true">이전</span>}
        <span>{page} / {lastPage}</span>
        {page < lastPage ? <Link href={directoryHref(filters, page + 1)}>다음<ChevronRight size={17} aria-hidden="true" /></Link> : <span aria-disabled="true">다음</span>}
      </nav>}
    </section>}
    <footer className={styles.sourceNote}>
      <p>사업장을 찾지 못했나요? <Link href="/workplaces/new">직접 등록할 수 있어요</Link></p>
      <SourceLink href="https://www.data.go.kr/data/15126955/fileData.do">김해시 공장기업 현황 원문</SourceLink>
    </footer>
  </div>;
}
