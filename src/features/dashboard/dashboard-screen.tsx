"use client";
import { translate } from "@/i18n/translate";


import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, ChevronRight, ClipboardList, Files, FolderOpen, Plus } from "lucide-react";
import { useState } from "react";

import { QueryFeedback } from "@/components/ui/query-feedback";
import { CaseCards, caseTaskHref } from "@/features/cases/components/case-cards";
import { useCases } from "@/features/cases/queries";
import { caseCard } from "@/features/cases/view-models";
import { useWorkplaces } from "@/features/workplaces/queries";

import styles from "./dashboard.module.css";
import { WorkflowProgress } from "./workflow-progress";

export function DashboardScreen() {
  const [attentionLimit, setAttentionLimit] = useState(3);
  const workplaces = useWorkplaces();
  const cases = useCases();
  const sorted = cases.data
    ? [...cases.data.items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    : undefined;
  const recent = sorted?.slice(0, 6);
  const attention = cases.data?.items.filter((item) => item.attentionRequired === true);
  const knownAttention = cases.data?.items.filter((item) => item.attentionRequired !== undefined).length;
  const current = sorted?.find((item) => item.status === "IN_PROGRESS" || item.status === "CREATED");
  const card = current && caseCard(current);
  const firstWorkplace = workplaces.isSuccess && workplaces.data.total === 0;
  const showOnboarding = firstWorkplace && !current;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1>{current ? translate("dashboard.dashboardScreen_wage_continue") : translate("dashboard.dashboardScreen_wage_review")}</h1>
        <Link href="/cases/new" className={styles.secondaryButton}>
          <Plus size={16} aria-hidden="true" />{translate("dashboard.dashboardScreen_newWage_review")}</Link>
      </header>

      {cases.isPending && <QueryFeedback pending />}
      {cases.isError && <QueryFeedback error={cases.error} retry={() => void cases.refetch()} />}
      {workplaces.isPending && !cases.isPending && <QueryFeedback pending />}
      {workplaces.isError && <QueryFeedback error={workplaces.error} retry={() => void workplaces.refetch()} />}

      {showOnboarding && (
        <section className={styles.spotlight} aria-labelledby="first-workplace">
          <div className={styles.caseInfo}>
            <h2 id="first-workplace" className={styles.heroTitle}>{translate("dashboard.dashboardScreen_workplace_create")}</h2>
            <p className={styles.heroDescription}>{translate("dashboard.dashboardScreen_workplace_create_wagePeriod_wage_record_count")}</p>
            <Link href="/workplaces/new" className={styles.primaryButton}>
              {translate("dashboard.dashboardScreen_workplace_create_2")}<ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.emptyIllustration} aria-hidden="true"><Building2 strokeWidth={1.25} /></div>
        </section>
      )}

      {current && card ? (
        <section className={styles.spotlight} aria-labelledby="current-review">
          <div className={styles.caseInfo}>
            <h2 id="current-review" className={styles.heroLabel}>
              <FolderOpen size={18} aria-hidden="true" />{translate("dashboard.dashboardScreen_current_review")}</h2>
            <h3 className={styles.heroTitle}>{card.workplaceName}</h3>
            <p className={styles.period}><CalendarDays size={16} aria-hidden="true" />{card.period}</p>
            <p className={styles.caseStatus}><strong>{card.status}</strong><span>{card.payType}</span></p>
            <Link href={caseTaskHref(current)} className={styles.primaryButton}>
              {translate("dashboard.dashboardScreen_current_case")}<ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.stepsPanel}>
            <p className={styles.stepHeading}>{translate("dashboard.dashboardScreen_review_step")}</p>
            <WorkflowProgress item={current} />
            <p className={styles.stepNote}>{translate("dashboard.dashboardScreen_step_check_complete_result_match")}</p>
          </div>
        </section>
      ) : cases.data && workplaces.isSuccess && !firstWorkplace && (
        <section className={styles.quietPanel}>
          <h2>{translate("dashboard.dashboardScreen_current_review")}</h2>
          <p>{translate("dashboard.dashboardScreen_scope_progress_case_empty")}</p>
        </section>
      )}

      <div className={styles.overview}>
        <section className={styles.panel} aria-labelledby="attention-heading">
          <div className={styles.sectionHead}>
            <h2 id="attention-heading">{translate("dashboard.dashboardScreen_confirm")}</h2>
            {!!attention?.length && <span className={styles.attentionCount}>{translate("dashboard.dashboardScreen_reviewCount", { value1: attention.length })}</span>}
          </div>
          {attention?.length ? (
            <div className={styles.attentionList}>
              <CaseCards items={attention.slice(0, attentionLimit)} compact />
              {attentionLimit < attention.length && (
                <button type="button" className={styles.more} onClick={() => setAttentionLimit(n => n + 3)}>{translate("dashboard.dashboardScreen_showMore", { value1: Math.min(attentionLimit, attention.length), value2: attention.length })}</button>
              )}
            </div>
          ) : cases.data && (
            <p className={styles.emptyNote}>
              {knownAttention ? translate("dashboard.dashboardScreen_scope_add_confirm_request_empty") : translate("dashboard.dashboardScreen_confirm_required_information_notProvided")}
            </p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="overview-heading">
          <h2 id="overview-heading">{translate("dashboard.dashboardScreen_review")}</h2>
          <div className={styles.stat}>
            <Building2 aria-hidden="true" /><h3>{translate("dashboard.dashboardScreen_all_workplace")}</h3>
            <strong>{workplaces.data ? translate("dashboard.dashboardScreen_itemCount", { value1: workplaces.data.total }) : "—"}</strong>
          </div>
          <div className={styles.stat}>
            <Files aria-hidden="true" /><h3>{translate("dashboard.dashboardScreen_all_wageCase")}</h3>
            <strong>{cases.data ? translate("dashboard.dashboardScreen_itemCount", { value1: cases.data.total }) : "—"}</strong>
          </div>
          <div className={styles.stat}>
            <ClipboardList aria-hidden="true" /><h3>{translate("dashboard.dashboardScreen_case_confirm_required")}</h3>
            <strong>{knownAttention ? translate("dashboard.dashboardScreen_itemCount", { value1: attention?.length }) : translate("dashboard.dashboardScreen_information_none")}</strong>
          </div>
          {cases.data && <p className={styles.note}>{translate("dashboard.dashboardScreen_confirm_required_provided_basis", { value1: knownAttention })}</p>}
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="recent-heading">
        <div className={styles.sectionHead}>
          <h2 id="recent-heading">{translate("dashboard.dashboardScreen_case")}</h2>
          <Link href="/cases" className={styles.textLink}>{translate("dashboard.dashboardScreen_all_case")}<ChevronRight size={16} aria-hidden="true" /></Link>
        </div>
        {recent?.length ? (
          <div className={styles.recentList}><CaseCards items={recent} /></div>
        ) : cases.data && (
          <div className={styles.quietPanel}>
            <h3>{translate("dashboard.dashboardScreen_wageCase_empty")}</h3>
            <p>{translate("dashboard.dashboardScreen_wagePeriod_wage_record")}</p>
            <Link href={workplaces.data?.total === 0 ? "/workplaces/new" : "/cases/new"} className={styles.textLink}>
              {translate("dashboard.dashboardScreen_case_2")}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
        <details className={styles.scope}>
          <summary>{translate("dashboard.dashboardScreen_list_scope")}</summary>
          <p>{translate("dashboard.dashboardScreen_page_maximum_confirm_list_case_count")}</p>
          <p>{translate("dashboard.dashboardScreen_all_workplace_case_count_provided_complete_status")}</p>
        </details>
      </section>
      <footer><Link href="/settings" className={styles.textLink}>{translate("dashboard.dashboardScreen_account_settings")}<ChevronRight size={15} aria-hidden="true" /></Link></footer>
    </div>
  );
}
