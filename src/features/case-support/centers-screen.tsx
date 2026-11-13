"use client";
import { useTranslation } from '@/i18n/use-translation';

import { PageHeading } from "@/components/ui/page-heading";
import { SupportLinks } from "./support-navigation";
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
 const {translate, translateContent} = useTranslation();

  const s = useSessionScope();
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [filters, setFilters] = useState({ region: "", category: "", page: 1 });
  const q = useQuery({ queryKey: [...businessKeys.root(s.generation), "consultation-centers", filters], enabled: s.enabled, queryFn: ({ signal }) => supportApi(s.api).centers(filters.region, filters.category, filters.page, signal) });
  const items = q.data?.items;
  return <div className="t7-support w-full max-w-6xl min-w-0 space-y-5 [overflow-wrap:anywhere]">
    <PageHeading title={translate("caseSupport.centersScreen_consultationCenter")} description={translate("caseSupport.centersScreen_consultation_count_information_confirm")}/><SupportLinks/>
    <form className={`${cardStyle} grid min-w-0 gap-4 sm:grid-cols-2`} onSubmit={e => { e.preventDefault(); setFilters({ region, category, page: 1 }); }}>
      <label>{translate("caseSupport.centersScreen_region")}<input className="ui-control " placeholder={translate("caseSupport.centersScreen_placeholder_label")} value={region} onChange={e => setRegion(e.target.value)}/></label>
      <label>{translate("caseSupport.centersScreen_consultation_minutes")}<select aria-label={translate("caseSupport.centersScreen_consultation_minutes")} className="ui-control " value={category} onChange={e => setCategory(e.target.value)}><option value="">{translate("caseSupport.centersScreen_all_minutes")}</option><option value="WAGE">{translate("caseSupport.centersScreen_wage")}</option></select></label>
      <button className={`${secondaryButton} w-full sm:col-span-2`} disabled={q.isFetching}>{translate("caseSupport.centersScreen_form")}</button>
    </form>
    {q.isPending ? <QueryFeedback pending/> : q.isError ? <QueryFeedback error={q.error} retry={() => void q.refetch()}/> : <>
      {q.data.nationwideFallbackUsed && <p role="status">{translate("caseSupport.centersScreen_region_unit")}</p>}
      {!items?.length && <p>{translate("caseSupport.centersScreen_consultationCenter_empty_region_minutes_page_search")}</p>}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">{items?.map(c => <article className={`${cardStyle} space-y-2`} key={c.centerId}><h2 className="font-bold">{c.name}</h2>{c.dataSource === "MOCK" && <p>{translate("caseSupport.centersScreen_example_confirm_information")}</p>}<p>{c.region} · {c.isNationwide === true ? translate("caseSupport.centersScreen_unit") : c.isNationwide === false ? translate("caseSupport.centersScreen_region_2") : translate("caseSupport.centersScreen_scope_notProvided")}</p><p>{translate("caseSupport.centersScreen_consultation_minutes_2", { value1: c.categories.join(", ") || translate("common.notProvided") })}</p><p>{translateContent("caseSupport.centersScreen_contact", { value1: safePhone(c.phone) ? <a className="inline-flex min-h-11 items-center underline" href={safePhone(c.phone)}>{c.phone}</a> : translate("caseSupport.centersScreen_confirm_contact_none") })}</p><p>{translateContent("caseSupport.centersScreen_website", { value1: safeWebsite(c.website) ? <a className="inline-flex min-h-11 items-center underline" href={safeWebsite(c.website)} target="_blank" rel="noopener noreferrer">{c.website}</a> : translate("caseSupport.centersScreen_confirm_website_none") })}</p><p>{translateContent("caseSupport.centersScreen_source", { value1: safeWebsite(c.sourceUrl) ? <a className="inline-flex min-h-11 items-center underline" href={safeWebsite(c.sourceUrl)} target="_blank" rel="noopener noreferrer">{c.sourceUrl}</a> : translate("caseSupport.centersScreen_confirm") })}</p><p>{translate("caseSupport.centersScreen_article6", { value1: c.verifiedAt ?? translate("caseSupport.centersScreen_confirm") })}</p></article>)}</div>
      <nav aria-label={translate("caseSupport.centersScreen_consultationCenter_page")} className="flex flex-wrap items-center gap-3"><button className={secondaryButton} disabled={filters.page === 1 || q.isFetching} onClick={() => setFilters(v => ({ ...v, page: v.page - 1 }))}>{translate("caseSupport.centersScreen_previous_page")}</button><span>{translate("caseSupport.centersScreen_page_all", { value1: q.data.page, value2: q.data.total })}</span><button className={secondaryButton} disabled={q.isFetching || q.data.page * q.data.size >= q.data.total} onClick={() => setFilters(v => ({ ...v, page: v.page + 1 }))}>{translate("caseSupport.centersScreen_next_page")}</button></nav>
    </>}
  </div>;
}
