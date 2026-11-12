"use client";
import { translate } from "@/i18n/translate";


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
          <p className={styles.eyebrow}><span aria-hidden="true" />{translate("workplaces.workplaceListScreen_wage")}</p>
          <h1>{translate("workplaces.workplaceListScreen_workplace")}</h1>
          <p className={styles.intro}>{translate("workplaces.workplaceListScreen_wage_2")}<br />{translate("workplaces.workplaceListScreen_confirm_workplace_select")}</p>
          {!empty && <Link href="/workplaces/new" className={styles.register}><Plus size={18} aria-hidden="true" />{translate("workplaces.workplaceForm_workplace_create")}</Link>}
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
          <h2>{translate("workplaces.workplaceListScreen_workplace_create")}</h2>
          <p>{translate("workplaces.workplaceListScreen_create_confirm_wage_period_record")}</p>
          <Link href="/workplaces/new" className={primaryButton}><Plus size={18} aria-hidden="true" />{translate("workplaces.workplaceForm_workplace_create")}</Link>
        </section>
      ) : (
        <section aria-labelledby={`${id}-list-title`} className={styles.panel}>
          <div className={styles.listHead}>
            <h2 id={`${id}-list-title`}>{translate("workplaces.workplaceListScreen_create_workplace")}<span>{translate("workplaces.workplaceListScreen_h22", { value1: query.data.total })}</span></h2>
            <div className={styles.search}>
              <label htmlFor={`${id}-search`}>{translate("workplaces.workplaceListScreen_current_page_search")}</label>
              <div className={styles.searchControl}>
                <Search size={18} aria-hidden="true" />
                <input ref={searchInput} id={`${id}-search`} type="search" placeholder={translate("workplaces.workplaceListScreen_workplace_industry_region")} value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
          </div>
          {hasSearch && <div className={styles.searchStatus}><p role="status">{translate("workplaces.workplaceListScreen_current_page", { value1: items?.length ?? 0 })}</p><button type="button" onClick={clearSearch}>{translate("workplaces.workplaceListScreen_search")}</button></div>}

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
                <span id={actionId} className={styles.action}>{hasCases ? <>{translate("workplaces.workplaceListScreen_wageCase")}<strong>{translate("workplaces.workplaceListScreen_span2", { value1: item.caseCount })}</strong> {translate("workplaces.workplaceListScreen_span3")}</> : translate("workplaces.workplaceListScreen_wageCase_2")}<ArrowRight size={18} aria-hidden="true" /></span>
              </Link>
              {!hasCases && <div className={styles.cardFoot}><p>{translate("workplaces.workplaceListScreen_create_wageCase_empty")}</p><Link href={`/workplaces/${item.id}`} aria-label={translate("workplaces.workplaceListScreen_workplace_information", { value1: item.name })}>{translate("workplaces.workplaceForm_workplace_information")}</Link></div>}
            </li>;
          })}</ul> : <div className={styles.noResults}><Search size={28} aria-hidden="true" /><h3>{translate("workplaces.workplaceListScreen_current_page_search_result_empty")}</h3><p>{translate("workplaces.workplaceListScreen_search_page_confirm")}</p><button type="button" className={secondaryButton} onClick={clearSearch}>{translate("workplaces.workplaceListScreen_current_page_all")}</button></div>}

          {query.data.total > query.data.size && <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={(next) => { setPage(next); setSearch(""); }} />}
        </section>
      )}
      {!empty && query.isSuccess && <p className={styles.note}>{translate("workplaces.workplaceListScreen_employmentEnd_workplace_wage_confirm_count")}</p>}
    </div>
  );
}
