"use client";

import { ExternalLink, FileSearch, Info, Search } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { useTranslation } from "@/i18n/use-translation";
import type { MessageKey } from "@/i18n/translate";
import { loadPublicationCatalog, publicationSource, searchPublication, type PublicationCatalog, type PublicationRecord } from "../publication-catalog";
import styles from "./workplace-registration.module.css";

const categoryMessages: Record<PublicationRecord["category"], MessageKey> = {
  FATALITIES: "workplaces.publicationFatalities", FATALITY_RATE: "workplaces.publicationFatalityRate",
  MAJOR_ACCIDENT: "workplaces.publicationMajorAccident", CONCEALMENT: "workplaces.publicationConcealment",
  NON_REPORTING: "workplaces.publicationNonReporting", CONTRACTOR_COMBINED: "workplaces.publicationContractorCombined",
  LEGACY_MAJOR_ACCIDENT: "workplaces.publicationLegacyMajorAccident",
};
type SearchState = { name: string; region: string; records: PublicationRecord[] };

export function PublicationLookup({ name, region, loadCatalog = loadPublicationCatalog }: {
  name: string; region: string; loadCatalog?: () => Promise<PublicationCatalog>;
}) {
  const { translate, format } = useTranslation();
  const id = useId();
  const cached = useRef<PublicationCatalog | null>(null);
  const request = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<SearchState | null>(null);
  const [page, setPage] = useState(1);
  const stale = result && (result.name !== name.trim() || result.region !== region.trim());
  async function search() {
    if (!name.trim()) return;
    const sequence = ++request.current;
    const input = { name: name.trim(), region: region.trim() };
    setStatus("loading");
    try {
      const catalog = cached.current ?? await loadCatalog();
      if (sequence !== request.current) return;
      cached.current = catalog;
      setResult({ ...input, records: searchPublication(catalog, input.name, input.region) });
      setPage(1);
      setStatus("success");
    } catch {
      if (sequence === request.current) setStatus("error");
    }
  }
  const newWindow = <span className="sr-only">{translate("workplaces.publicationNewWindow")}</span>;
  return (
    <aside className={styles.publication} aria-labelledby={`${id}-title`}>
      <div className={styles.panelHeading}>
        <span className={styles.documentIcon}><FileSearch size={23} aria-hidden="true" /></span>
        <div><p className={styles.eyebrow}>{translate("workplaces.publicationOptional")}</p><h2 id={`${id}-title`}>{translate("workplaces.publicationTitle")}</h2></div>
      </div>
      <p className={styles.publicationIntro}>{translate("workplaces.publicationIntro")}</p>
      <div className={styles.sourceMeta}>
        <span>{translate("workplaces.publicationEdition", { year: publicationSource.year })}</span>
        <span>{translate("workplaces.publicationPublished", { date: format.dateTime(new Date(`${publicationSource.publishedAt}T00:00:00+09:00`), { year: "numeric", month: "2-digit", day: "2-digit" }) })}</span>
      </div>
      <p className={styles.searchHint} id={`${id}-hint`}>{translate("workplaces.publicationSearchHint")}</p>
      <button type="button" className={styles.searchButton} onClick={() => { void search(); }} disabled={!name.trim() || status === "loading"} aria-describedby={`${id}-hint`} aria-controls={`${id}-results`}>
        <Search size={17} aria-hidden="true" />{translate(status === "loading" ? "workplaces.publicationLoading" : "workplaces.publicationSearch")}
      </button>
      <div id={`${id}-results`} className={styles.results} aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" && <p role="status" className={styles.feedback}>{translate("workplaces.publicationLoading")}</p>}
        {status === "error" && <div role="alert" className={styles.error}><p>{translate("workplaces.publicationError")}</p><button type="button" onClick={() => { void search(); }} disabled={!name.trim()}>{translate("common.retry")}</button></div>}
        {status === "success" && stale && <p role="status" className={styles.feedback}>{translate("workplaces.publicationChanged")}</p>}
        {status === "success" && result && !stale && <>
          <p role="status" className={styles.resultCount}>{translate("workplaces.publicationResultCount", { name: result.name, count: result.records.length })}</p>
          {result.records.length === 0 ? <div className={styles.empty}><FileSearch size={27} aria-hidden="true" /><p>{translate("workplaces.publicationEmpty")}</p><span>{translate("workplaces.publicationEmptyHint")}</span></div> : <>
            <p className={styles.matchNotice}>{translate("workplaces.publicationMatchNotice")}</p>
            <ul className={styles.recordList}>{result.records.slice((page - 1) * 5, page * 5).map(record => <li key={record.id}>
              <span className={styles.category}>{translate(categoryMessages[record.category])}</span>
              <h3>{record.name}</h3>
              <p className={styles.address}>{record.address}</p>
              <p className={styles.recordMeta}>{record.incidentYear !== null ? translate("workplaces.publicationIncidentYear", { year: record.incidentYear }) : translate(record.category === "NON_REPORTING" ? "workplaces.publicationReportingPeriod" : "workplaces.publicationDetectionYear")}</p>
              <a href={`${publicationSource.pdfUrl}#page=${record.sourcePage}`} target="_blank" rel="noopener noreferrer">{translate("workplaces.publicationSourcePage", { page: record.sourcePage })}<ExternalLink size={13} aria-hidden="true" />{newWindow}</a>
            </li>)}</ul>
            {result.records.length > 5 && <Pagination page={page} size={5} total={result.records.length} onPage={setPage} />}
          </>}
        </>}
      </div>
      <div className={styles.limitNote}><Info size={17} aria-hidden="true" /><p>{translate("workplaces.publicationLimit")}</p></div>
      <div className={styles.sourceLinks}>
        <a href={publicationSource.pageUrl} target="_blank" rel="noopener noreferrer">{translate("workplaces.publicationPressSource")}<ExternalLink size={13} aria-hidden="true" />{newWindow}</a>
        <a href={publicationSource.pdfUrl} target="_blank" rel="noopener noreferrer">{translate("workplaces.publicationListSource")}<ExternalLink size={13} aria-hidden="true" />{newWindow}</a>
      </div>
    </aside>
  );
}
