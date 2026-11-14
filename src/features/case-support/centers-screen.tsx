"use client";
import { useTranslation } from '@/i18n/use-translation';
import { ArrowUpRight, Building2, Clock3, Languages, Mail, MapPin, Navigation, Phone, Search } from "lucide-react";
import { SupportLinks } from "./support-navigation";
import { useState, type Dispatch, type SetStateAction } from "react";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import styles from "./centers-screen.module.css";
import { useRegisteredCenters, type CenterFilters } from "./queries";
import { addressSearch, catalogCheckedAt, centerCatalog, centerGroup, centerReach, filterCatalog, safeEmail, safePhone, safeWebsite, type CenterGroup, type ResearchedCenter } from './center-catalog';

function readableDetail(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value) && value.every(item => typeof item === "string")) return value.map(item => item.trim()).filter(Boolean).join(", ") || undefined;
  return undefined;
}

export function CentersScreen() {
  const {translate} = useTranslation();
  const [region, setRegion] = useState("");
  const [group, setGroup] = useState<CenterGroup | ''>('');
  const [filters, setFilters] = useState<CenterFilters>({ region: "", category: "", page: 1 });
  const catalog = filterCatalog(filters.region, group);
  return <div className={styles.page}>
    <header className={styles.hero}><div><p className={styles.eyebrow}>{translate("caseSupport.centersScreen_consultationCenter")}</p><h1>{translate("caseSupport.centersScreen_heroTitle")}<span>{translate("caseSupport.centersScreen_heroEmphasis")}</span></h1><p className={styles.description}>{translate("caseSupport.centersScreen_consultation_count_information_confirm")}</p></div><div className={styles.heroArt} aria-hidden="true"><span className={styles.mapLayer}/><span className={styles.mapLayer}/><span className={styles.pin}><MapPin size={65} strokeWidth={2.5}/></span></div></header>
    <div className={styles.supportNav}><SupportLinks/></div>
    <form className={styles.filters} onSubmit={e => { e.preventDefault(); setFilters(v => ({ ...v, region, page: 1 })); }}>
      <h2><Search size={21} aria-hidden="true"/>{translate("caseSupport.centersScreen_searchTitle")}</h2>
      <label>{translate("caseSupport.centersScreen_region")}<input className="ui-control" placeholder={translate("caseSupport.centersScreen_placeholder_label")} value={region} onChange={e => setRegion(e.target.value)}/></label>
      <button className={styles.searchButton}><Search size={18} aria-hidden="true"/>{translate("caseSupport.centersScreen_form")}</button>
    </form>
    <section className={styles.catalog} aria-labelledby="catalog-title">
      <div className={styles.catalogHeading}><div><p className={styles.eyebrow}>{translate('caseSupport.directory_publicSources')}</p><h2 id="catalog-title">{translate('caseSupport.directory_count', {count:catalog.length})}</h2></div><p>{translate('caseSupport.directory_checked', {date:catalogCheckedAt})}</p></div>
      <p className={styles.catalogHelp}>{translate('caseSupport.directory_scope', {count:centerCatalog.length})}</p>
      <div className={styles.groupFilters} role="group" aria-label={translate('caseSupport.directory_kind')}>
        {(['', 'PUBLIC', 'COMMUNITY', 'PRIVATE'] as const).map(value => <button type="button" aria-pressed={group===value} key={value} onClick={()=>setGroup(value)}>{translate(value===''?'caseSupport.directory_all':value==='PUBLIC'?'caseSupport.directory_public':value==='COMMUNITY'?'caseSupport.directory_community':'caseSupport.directory_private')}</button>)}
      </div>
      {filters.region && <p className={styles.fallback} role="status">{translate('caseSupport.directory_regionHelp')}</p>}
      {!catalog.length && <div className={styles.empty}><p>{translate('caseSupport.directory_empty')}</p><button type="button" className={secondaryButton} onClick={()=>{setGroup('');setRegion('');setFilters({region:'',category:'',page:1})}}>{translate('caseSupport.directory_reset')}</button></div>}
      <div className={styles.results}>{catalog.map(center=><CatalogCard key={center.researchId} center={center}/>)}</div>
      <aside className={styles.catalogNotice}><Building2 size={22} aria-hidden="true"/><div><h3>{translate('caseSupport.directory_beforeContact')}</h3><p>{translate('caseSupport.directory_disclaimer')}</p></div></aside>
    </section>
    <RegisteredCenters filters={filters} setFilters={setFilters}/>
  </div>;
}

function RegisteredCenters({filters,setFilters}:{filters:CenterFilters;setFilters:Dispatch<SetStateAction<CenterFilters>>}) {
  const {translate,translateContent}=useTranslation();
  const q=useRegisteredCenters(filters);
  const items=q.data?.items;
  return (
    <details className={styles.registered}>
    <summary>{translate('caseSupport.directory_registered')}</summary>
    <p className={styles.catalogHelp}>{translate('caseSupport.directory_registeredHelp')}</p>
    <label className={styles.registeredFilter}>{translate("caseSupport.centersScreen_consultation_minutes")}<select aria-label={translate("caseSupport.centersScreen_consultation_minutes")} className="ui-control" value={filters.category} onChange={e => setFilters(v=>({...v,category:e.target.value,page:1}))}><option value="">{translate("caseSupport.centersScreen_all_minutes")}</option><option value="WAGE">{translate("caseSupport.centersScreen_wage")}</option></select></label>
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
    </details>
  );
}

function CatalogCard({center:c}:{center:ResearchedCenter}) {
  const {translate} = useTranslation();
  const kind=centerGroup(c),reach=centerReach(c),map=addressSearch(c);
  const missing=translate('common.notProvided');
  return <article className={styles.card} data-research-id={c.researchId}>
    <div className={styles.cardTop}><span className={styles.locationIcon}><Building2 size={24} aria-hidden="true"/></span><div className={styles.badges}><span className={styles.scope} data-kind={kind}>{translate(kind==='PUBLIC'?'caseSupport.directory_public':kind==='COMMUNITY'?'caseSupport.directory_community':'caseSupport.directory_private')}</span>{reach!=='OFFICE'&&<span className={styles.scope}>{translate(reach==='PHONE'?'caseSupport.directory_remotePhone':'caseSupport.directory_online')}</span>}</div></div>
    <div><h3 className={styles.agencyName}>{c.name}</h3><p className={styles.categories}>{c.topics.join(' · ')}</p></div>
    <div className={styles.audience}><span>{translate('caseSupport.directory_audience')}</span><p>{c.serviceArea}</p></div>
    <div className={styles.catalogContact}>
      {safePhone(c.phone)?<a className={styles.callAction} href={safePhone(c.phone)}><Phone size={20} aria-hidden="true"/>{c.phone}</a>:safeEmail(c.email)?<a className={styles.callAction} href={safeEmail(c.email)}><Mail size={20} aria-hidden="true"/><span>{c.email}</span></a>:<p>{translate('caseSupport.centersScreen_confirm_contact_none')}</p>}
      <div className={styles.secondaryActions}>{safeWebsite(c.website)&&<a href={safeWebsite(c.website)} target="_blank" rel="noopener noreferrer">{translate('caseSupport.directory_website')}<ArrowUpRight size={16} aria-hidden="true"/></a>}{map&&<a href={map} target="_blank" rel="noopener noreferrer"><MapPin size={16} aria-hidden="true"/>{translate('caseSupport.directory_addressSearch')}</a>}</div>
    </div>
    <dl className={styles.detailList}>
      <div><dt><MapPin size={16} aria-hidden="true"/>{translate('caseSupport.directory_office')}</dt><dd>{c.officeRegion??missing}</dd></div>
      <div><dt><Clock3 size={16} aria-hidden="true"/>{translate('caseSupport.centersScreen_hours')}</dt><dd>{c.businessHours??missing}</dd></div>
      <div><dt>{translate('caseSupport.directory_fee')}</dt><dd>{c.feeInformation??translate('caseSupport.directory_feeUnknown')}</dd></div>
    </dl>
    <details className={styles.agencyDetails}><summary>{translate('caseSupport.directory_details')}</summary>
      <dl className={styles.detailList}>
        <div><dt>{translate('caseSupport.directory_org')}</dt><dd>{c.organizationType}</dd></div>
        <div><dt>{translate('caseSupport.directory_channels')}</dt><dd>{c.channels.join(' · ')}</dd></div>
        <div><dt><Languages size={16} aria-hidden="true"/>{translate('caseSupport.centersScreen_languages')}</dt><dd>{c.languages?.join(' · ')??missing}</dd></div>
        <div><dt>{translate('caseSupport.directory_address')}</dt><dd>{c.address??missing}</dd></div>
        {c.additionalPhones.length>0&&<div><dt>{translate('caseSupport.directory_morePhones')}</dt><dd>{c.additionalPhones.map(phone=>safePhone(phone)?<a key={phone} href={safePhone(phone)}>{phone}</a>:<span key={phone}>{phone}</span>)}</dd></div>}
        {safeEmail(c.email)&&c.phone&&<div><dt>{translate('caseSupport.directory_email')}</dt><dd><a href={safeEmail(c.email)}>{c.email}</a></dd></div>}
      </dl>
      <p className={styles.accessNotes}>{c.accessNotes}</p>
      <div className={styles.meta}>{c.sources.map((source,i)=>safeWebsite(source.url)&&<p key={source.url}><a href={safeWebsite(source.url)} target="_blank" rel="noopener noreferrer">{translate('caseSupport.directory_source', {number:i+1})}</a><span> · {source.supports.join(' · ')}</span></p>)}</div>
    </details>
    <p className={styles.checked}>{translate('caseSupport.directory_checked', {date:c.checkedAt})}</p>
  </article>;
}
