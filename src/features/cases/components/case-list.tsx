"use client";
import { translate } from "@/i18n/translate";
import { activeLocale as defaultLocale } from "@/i18n/config";


import Link from "next/link";
import { Check, FileText, FolderOpen, Info, Plus } from "lucide-react";
import { useState } from "react";

import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton } from "@/components/ui/styles";

import { useCases } from "../queries";
import { CaseCards } from "./case-cards";
import styles from "./case-explorer.module.css";

export function CaseList({ workplaceId }: { workplaceId?: number }) {
  const [page, setPage] = useState(1);
  const query = useCases(page, 20, workplaceId);
  const createHref = workplaceId === undefined ? "/cases/new" : `/cases/new?workplaceId=${workplaceId}`;
  const standalone = workplaceId === undefined;
  const data = query.data;
  return (
    <section className={standalone ? styles.explorer : "min-w-0 space-y-4"} aria-label={translate("cases.caseDetailScreen_wage_confirm_case")}>
      {standalone && (
        <header className={styles.header}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" />{translate("cases.caseList_wage")}</p>
            <h1>{translate("cases.caseDetailScreen_wage_confirm_case")}</h1>
            <p className={styles.intro}>{translate("cases.caseList_wage_2")}<br />{translate("cases.caseList_review")}</p>
            {(!data || data.total > 0) && (
              <Link href={createHref} className={styles.heroCreate}><Plus size={18} aria-hidden="true" />{translate("cases.caseList_new_case_start")}</Link>
            )}
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.artHalo} />
            <div className={styles.paperBack} />
            <div className={styles.paper}>
              <span className={styles.paperIcon}><FileText size={28} strokeWidth={1.8} /></span>
              <span className={styles.paperTitle}>{translate("cases.caseList_wage")}</span>
              <div className={styles.paperLines}><i /><i /><i /></div>
              <div className={styles.paperBottom}><span /><span /></div>
            </div>
            <span className={styles.artCheck}><Check size={34} strokeWidth={3} /></span>
            <span className={styles.artCoin}>₩</span>
            <span className={styles.artSparkle}>+</span>
            <span className={styles.artDot} />
          </div>
        </header>
      )}
      {query.isPending && <div className={standalone ? styles.feedback : undefined}><QueryFeedback pending /></div>}
      {query.isError && <div className={standalone ? styles.feedback : undefined}><QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /></div>}
      {data && (
        <div className={standalone ? styles.panel : "space-y-4"}>
          {standalone && (
            <div className={styles.listHeading}>
              <h2>{translate("cases.caseList_all_case")}<span>{translate("cases.caseList_h22", { value1: data.total.toLocaleString(defaultLocale) })}</span></h2>
              <p>{translate("cases.caseList_case_select")}</p>
            </div>
          )}
          {standalone && data.items.length === 0 && data.total > 0 ? (
            <p className={styles.empty}>{translate("cases.caseList_page_case_empty")}</p>
          ) : data.items.length === 0 ? (
            <div className={standalone ? styles.empty : cardStyle}>
              {standalone && <span className={styles.emptyIcon}><FolderOpen aria-hidden="true" size={30} strokeWidth={1.7} /></span>}
              <h2 className="text-title font-bold">{translate("cases.caseList_create_wageCase_empty")}</h2>
              <p className="my-4 text-body text-muted">{translate("cases.caseList_workplace_wagePeriod_select_case_start")}</p>
              <Link href={createHref} className={standalone ? styles.create : primaryButton}>{translate("cases.caseList_case_start")}</Link>
            </div>
          ) : <CaseCards items={data.items} variant={standalone ? "explorer" : "workplace"} />}
          {(standalone ? data.total > 0 || data.page > 1 : data.total > data.size || data.page > 1) && (
            <Pagination page={data.page} size={data.size} total={data.total} onPage={setPage} busy={query.isFetching} />
          )}
        </div>
      )}
      {standalone && data && data.total > 0 && (
        <p className={styles.note}><Info size={16} aria-hidden="true" />{translate("cases.caseList_case_status_review_progress")}</p>
      )}
    </section>
  );
}
