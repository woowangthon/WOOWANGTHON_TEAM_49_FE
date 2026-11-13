"use client";
import { useTranslation } from '@/i18n/use-translation';
import { Clock3, Languages, MapPin, Navigation, Phone, Search } from "lucide-react";
import { SupportLinks } from "./support-navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys } from "@/lib/query/business-keys";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { supportApi } from "./api";
import styles from "./centers-screen.module.css";

export function safeWebsite(value?: string | null) {
  if (!value) return undefined;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
export function safePhone(value?: string | null) { return value && /^\+?[0-9][0-9 ()-]{2,24}$/.test(value) ? `tel:${value.replace(/[ ()-]/g, "")}` : undefined; }

function readableDetail(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value) && value.every(item => typeof item === "string")) return value.map(item => item.trim()).filter(Boolean).join(", ") || undefined;
  return undefined;
}

export function CentersScreen() {
 const {translate, translateContent} = useTranslation();
 const navigationRef = useRef<HTMLDivElement>(null);
 useEffect(() => {
   const nav = navigationRef.current?.querySelector("nav");
   const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
   if (nav && current && nav.scrollWidth > nav.clientWidth) nav.scrollLeft += current.getBoundingClientRect().right - nav.getBoundingClientRect().right;
 }, []);

  const s = useSessionScope();
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [filters, setFilters] = useState({ region: "", category: "", page: 1 });
  const q = useQuery({ queryKey: [...businessKeys.root(s.generation), "consultation-centers", filters], enabled: s.enabled, queryFn: ({ signal }) => supportApi(s.api).centers(filters.region, filters.category, filters.page, signal) });
  const items = q.data?.items;
  return <div className={styles.page}>
    <header className={styles.hero}><div><p className={styles.eyebrow}>{translate("caseSupport.centersScreen_consultationCenter")}</p><h1>{translate("caseSupport.centersScreen_heroTitle")}<span>{translate("caseSupport.centersScreen_heroEmphasis")}</span></h1><p className={styles.description}>{translate("caseSupport.centersScreen_consultation_count_information_confirm")}</p></div><div className={styles.heroArt} aria-hidden="true"><span className={styles.mapLayer}/><span className={styles.mapLayer}/><span className={styles.pin}><MapPin size={65} strokeWidth={2.5}/></span></div></header>
    <div ref={navigationRef} className={styles.supportNav}><SupportLinks/></div>
    <form className={styles.filters} onSubmit={e => { e.preventDefault(); setFilters({ region, category, page: 1 }); }}>
      <h2><Search size={21} aria-hidden="true"/>{translate("caseSupport.centersScreen_searchTitle")}</h2>
      <label>{translate("caseSupport.centersScreen_region")}<input className="ui-control" placeholder={translate("caseSupport.centersScreen_placeholder_label")} value={region} onChange={e => setRegion(e.target.value)}/></label>
      <label>{translate("caseSupport.centersScreen_consultation_minutes")}<select aria-label={translate("caseSupport.centersScreen_consultation_minutes")} className="ui-control" value={category} onChange={e => setCategory(e.target.value)}><option value="">{translate("caseSupport.centersScreen_all_minutes")}</option><option value="WAGE">{translate("caseSupport.centersScreen_wage")}</option></select></label>
      <button className={styles.searchButton} disabled={q.isFetching}><Search size={18} aria-hidden="true"/>{translate("caseSupport.centersScreen_form")}</button>
    </form>
    {q.isPending ? <QueryFeedback pending/> : q.isError ? <QueryFeedback error={q.error} retry={() => void q.refetch()}/> : <>
      {q.data.nationwideFallbackUsed && <p className={styles.fallback} role="status">{translate("caseSupport.centersScreen_region_unit")}</p>}
      {!items?.length && <p className={styles.empty}>{translate("caseSupport.centersScreen_consultationCenter_empty_region_minutes_page_search")}</p>}
      <div className={styles.results}>{items?.map(c => <article className={styles.card} key={c.centerId}>
        <div className={styles.cardTop}><span className={styles.locationIcon}><MapPin size={24} aria-hidden="true"/></span><span className={styles.scope}>{c.isNationwide === true ? translate("caseSupport.centersScreen_unit") : c.isNationwide === false ? translate("caseSupport.centersScreen_region_2") : translate("caseSupport.centersScreen_scope_notProvided")}</span></div>
        <div><h2>{c.name}</h2>{c.dataSource === "MOCK" && <p className={styles.mock}>{translate("caseSupport.centersScreen_example_confirm_information")}</p>}</div>
        <div><p className={styles.region}><MapPin size={16} aria-hidden="true"/>{c.region}</p><p className={styles.categories}>{translate("caseSupport.centersScreen_consultation_minutes_2", { value1: c.categories.join(", ") || translate("common.notProvided") })}</p></div>
        <div className={styles.contact} data-available={Boolean(safePhone(c.phone))}><p>{translateContent("caseSupport.centersScreen_contact", { value1: safePhone(c.phone) ? <a href={safePhone(c.phone)}><Phone size={21} aria-hidden="true"/>{c.phone}</a> : translate("caseSupport.centersScreen_confirm_contact_none") })}</p></div>
        <dl className={styles.detailList}>
          <div><dt><Clock3 size={16} aria-hidden="true"/>{translate("caseSupport.centersScreen_hours")}</dt><dd>{readableDetail(c.businessHours) ?? translate("common.notProvided")}</dd></div>
          <div><dt><Languages size={16} aria-hidden="true"/>{translate("caseSupport.centersScreen_languages")}</dt><dd>{readableDetail(c.languages) ?? translate("common.notProvided")}</dd></div>
          <div><dt><Navigation size={16} aria-hidden="true"/>{translate("caseSupport.centersScreen_visit")}</dt><dd>{readableDetail(c.visitInformation) ?? translate("common.notProvided")}</dd></div>
        </dl>
        <div className={styles.meta}>
          <p>{translateContent("caseSupport.centersScreen_website", { value1: safeWebsite(c.website) ? <a href={safeWebsite(c.website)} target="_blank" rel="noopener noreferrer">{c.website}</a> : translate("caseSupport.centersScreen_confirm_website_none") })}</p>
          <p>{translateContent("caseSupport.centersScreen_source", { value1: safeWebsite(c.sourceUrl) ? <a href={safeWebsite(c.sourceUrl)} target="_blank" rel="noopener noreferrer">{c.sourceUrl}</a> : translate("caseSupport.centersScreen_confirm") })}</p>
          <p>{translate("caseSupport.centersScreen_article6", { value1: c.verifiedAt ?? translate("caseSupport.centersScreen_confirm") })}</p>
        </div>
      </article>)}</div>
      <nav aria-label={translate("caseSupport.centersScreen_consultationCenter_page")} className={styles.pagination}><button className={secondaryButton} disabled={filters.page === 1 || q.isFetching} onClick={() => setFilters(v => ({ ...v, page: v.page - 1 }))}>{translate("caseSupport.centersScreen_previous_page")}</button><span>{translate("caseSupport.centersScreen_page_all", { value1: q.data.page, value2: q.data.total })}</span><button className={secondaryButton} disabled={q.isFetching || q.data.page * q.data.size >= q.data.total} onClick={() => setFilters(v => ({ ...v, page: v.page + 1 }))}>{translate("caseSupport.centersScreen_next_page")}</button></nav>
    </>}
  </div>;
}
