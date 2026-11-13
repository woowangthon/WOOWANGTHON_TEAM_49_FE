"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesCasesViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { Building2, CalendarDays, ChevronRight, CircleAlert } from "lucide-react";
import type { CaseListDto } from "../schemas";

import styles from "./case-explorer.module.css";
import workplaceStyles from "@/features/workplaces/components/workplace-space.module.css";

export function caseTaskHref(dto: CaseListDto) {
  const paths = { UPLOAD: "upload", REVIEW: "review", CONDITIONS: "conditions", COMPARE: "compare", RESULT: "result" };
  return `/cases/${dto.caseId}${dto.currentStep ? `/${paths[dto.currentStep]}` : ""}`;
}

export function CaseCards({ items, compact = false, variant = "default" }: { items: CaseListDto[]; compact?: boolean; variant?: "default" | "explorer" | "workplace" }) {
const {caseCard} = useLocalized(createLocalizedFeaturesCasesViewModels);

 const {translate} = useTranslation();

  if (variant === "workplace") return <ul className={workplaceStyles.caseRows}>{items.map(dto => {
    const card = caseCard(dto);
    return <li key={card.id} className={workplaceStyles.caseCard}>
      <div className={workplaceStyles.caseTop}><span className={workplaceStyles.calendar} aria-hidden="true"><CalendarDays size={23} /></span><span className={workplaceStyles.badge}>{card.status}</span></div>
      <h3><Link href={`/cases/${card.id}`}><span>{dto.periodStart}</span><span>~ {dto.periodEnd}</span></Link></h3>
      <p className={workplaceStyles.caseMeta}>{translate("cases.caseCards_case", { value1: card.payType, value2: card.id })}</p>
      <p className={workplaceStyles.caseAttention} data-attention={dto.attentionRequired}>{card.attention}</p>
      <div className={workplaceStyles.caseBottom}><p><span>{translate("cases.caseCards_current")}</span><strong>{card.step}</strong></p><Link href={`/cases/${card.id}`} aria-label={translate("cases.caseCards_case_start", { value1: card.id })}>{translate("cases.caseCards_start")}<ChevronRight size={15} aria-hidden="true" /></Link></div>
    </li>;
  })}</ul>;
  if (variant === "explorer") {
    return (
      <ul className={styles.rows}>
        {items.map(dto => {
          const card = caseCard(dto);
          return (
            <li key={card.id} className={styles.row}>
              <div className={styles.cardTop}>
                <span className={styles.workplaceIcon} aria-hidden="true"><Building2 size={27} strokeWidth={1.7} /></span>
                <span data-case-status={dto.status} className={styles.status}>{card.status}</span>
              </div>
              <div className={styles.caseIdentity}>
                <div className={styles.caseTitle}>
                  <h3><Link href={`/cases/${card.id}`} aria-describedby={`case-explorer-period-${card.id}`}>{card.workplaceName}</Link></h3>
                  <span className={styles.payType}>{card.payType}</span>
                </div>
                <p id={`case-explorer-period-${card.id}`} className={styles.period}><CalendarDays size={14} aria-hidden="true" /><span><span className="sr-only">{translate("cases.caseCards_wagePeriod")}</span>{card.period}</span></p>
              </div>
              <div className={styles.caseStatus}>
                <p data-attention={dto.attentionRequired} className={styles.attention}>
                  {dto.attentionRequired === true && <CircleAlert size={14} aria-hidden="true" />}{card.attention}
                </p>
              </div>
              <div className={styles.caseAction}>
                <p className={styles.step}><span>{translate("cases.caseCards_current")}</span><strong>{card.step}</strong></p>
                <Link href={`/cases/${card.id}`} aria-describedby={`case-explorer-period-${card.id}`} className={styles.continue}>{translate("cases.caseCards_start")}<ChevronRight size={16} aria-hidden="true" /></Link>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return <ul className={`case-rows ${compact ? "case-rows-compact" : ""}`}>
    {items.map(dto => {
      const card = caseCard(dto);
      return <li key={card.id} className="case-row">
        <div className="min-w-0"><h3 className="font-bold"><Link href={`/cases/${card.id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{card.workplaceName}</Link></h3><p className="text-caption text-muted">{card.period}</p><p className="text-caption text-muted">{card.payType}</p></div>
        <div className="min-w-0 space-y-2"><span data-case-status={dto.status} className="inline-block rounded-control bg-neutral-soft px-3 py-1 text-caption font-bold">{card.status}</span><p data-attention={dto.attentionRequired} className="text-caption text-muted">{card.attention}</p></div>
        <div className="min-w-0"><p className="text-caption text-muted">{translate("cases.caseCards_current_2", { value1: card.step })}</p><Link href={`/cases/${card.id}`} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">{translate("cases.caseCards_start_2")}</Link></div>
      </li>;
    })}
  </ul>;
}
