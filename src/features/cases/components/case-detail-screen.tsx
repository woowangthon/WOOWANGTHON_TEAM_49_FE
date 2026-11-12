"use client";
import { translate } from "@/i18n/translate";


import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, ChevronRight, CircleAlert, Files, Info, Layers3, Pencil, WalletCards } from "lucide-react";

import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";

import { useCase, useCaseRemoval } from "../queries";
import { caseCard } from "../view-models";
import { caseTaskHref } from "./case-cards";
import { CaseForm } from "./case-form";
import { DeleteCase } from "./delete-case";
import styles from "./case-detail.module.css";

export function CaseDetailScreen({ id }: { id: number }) {
  const query = useCase(id);
  const removal = useCaseRemoval(id);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  if (removal.removed) return <div className={styles.screen}><section className={styles.panel}><h1 className="text-title font-bold">{translate("cases.caseDetailScreen_delete_wageCase")}</h1><Link href="/cases" className={`mt-4 ${secondaryButton}`}>{translate("cases.caseDetailScreen_wage_confirm_case_navigate")}</Link></section></div>;
  if (query.isPending) return <div className={`${styles.screen} ${styles.feedback}`}><QueryFeedback pending /></div>;
  if (query.isError) return <div className={`${styles.screen} ${styles.feedback}`}><QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /></div>;
  const dto = query.data;
  const item = caseCard(dto);

  return (
    <div className={styles.screen}>
      <div className={styles.breadcrumb}>
        <Link href={`/workplaces/${dto.workplaceId}`}><ArrowLeft size={17} aria-hidden="true" />{translate("cases.caseDetailScreen_wage_confirm_case")}</Link>
        <Link href={`/workplaces/${dto.workplaceId}`} className={styles.workplaceLink}><Building2 size={16} aria-hidden="true" />{translate("cases.caseDetailScreen_workplace")}<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroLabel}>
            <span className={styles.heroIcon} aria-hidden="true"><Building2 size={27} strokeWidth={1.7} /></span>
            <dl><dt className="sr-only">{translate("cases.caseDetailScreen_case_status")}</dt><dd className={styles.status} data-case-status={dto.status}>{item.status}</dd></dl>
          </div>
          <h1>{item.workplaceName}<span>{translate("cases.caseDetailScreen_wageCase")}</span></h1>
          <p className={styles.period}><CalendarDays size={17} aria-hidden="true" /><span><span className="sr-only">{translate("cases.caseCards_wagePeriod")}</span>{item.period}</span></p>
          <p className={styles.heroDescription}>{translate("cases.caseDetailScreen_wage_review_result")}</p>
        </div>
        <section className={styles.currentTask} aria-label={translate("cases.caseCards_current")}>
          <div className={styles.taskLabel}><Layers3 size={19} aria-hidden="true" /><span>{translate("cases.caseDetailScreen_continue")}</span></div>
          <dl><dt className="sr-only">{translate("cases.caseDetailScreen_current_step")}</dt><dd>{item.step}</dd></dl>
          <p>{translate("cases.caseDetailScreen_section3")}</p>
          <Link href={caseTaskHref(dto)} className={styles.primaryAction}>{translate("cases.caseDetailScreen_continue_review")}<ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </header>

      {saved && <p role="status" className={styles.saved}>{translate("cases.caseDetailScreen_case_information_save")}</p>}

      <section aria-label={translate("cases.caseDetailScreen_wageCase_detail_information")}>
        <div className={styles.sectionHead}><h2>{translate("cases.caseDetailScreen_case")}</h2><p>{translate("cases.caseDetailScreen_case_information")}</p></div>
        <dl className={styles.facts}>
          <div className={styles.fact}><dt><span className={styles.factIcon} aria-hidden="true"><WalletCards size={21} /></span>{translate("cases.caseDetailScreen_wage")}</dt><dd>{item.payType}</dd></div>
          <div className={styles.fact}><dt><span className={styles.factIcon} aria-hidden="true"><CalendarDays size={21} /></span>{translate("cases.caseDetailScreen_payment")}</dt><dd data-missing={dto.scheduledPayDate === null}>{dto.scheduledPayDate ?? translate("cases.caseDetailScreen_input")}</dd></div>
          <div className={styles.fact}><dt><span className={styles.factIcon} aria-hidden="true"><Files size={21} /></span>{translate("cases.caseDetailScreen_create_document")}</dt><dd>{dto.documentCount}<span className={styles.unit}>{translate("common.countUnit")}</span></dd></div>
          <div className={styles.fact} data-attention={dto.attentionRequired}><dt><span className={styles.factIcon} aria-hidden="true"><CircleAlert size={21} /></span>{translate("cases.caseDetailScreen_add_confirm")}</dt><dd className={styles.attentionValue}>{item.attention}{dto.attentionRequired && <span className={styles.attentionCount}>{translate("cases.caseDetailScreen_item", { value1: dto.attentionCount })}</span>}</dd></div>
        </dl>
        <p className={styles.note}><Info size={16} aria-hidden="true" /><span>{translate("cases.caseDetailScreen_case_status_step_check_calculation_comparison_complete")}</span></p>
      </section>


      <section className={styles.management} aria-label={translate("cases.caseDetailScreen_wageCase_2")}>
        {editing ? <>
          <div className={styles.sectionHead}><h2>{translate("cases.caseDetailScreen_case_information_edit")}</h2></div>
          <CaseForm initial={dto} onSaved={() => { setEditing(false); setSaved(true); }} onCancel={() => { setEditing(false); }} />
        </> : <div className={styles.managementRow}>
          <div><h2>{translate("cases.caseDetailScreen_case_settings")}</h2><p>{translate("cases.caseDetailScreen_wage_wagePeriod_information")}</p></div>
          <div className={styles.managementActions}>
            <button type="button" className={secondaryButton} onClick={() => { setEditing(true); setSaved(false); }}><Pencil size={15} aria-hidden="true" />{translate("cases.caseDetailScreen_case_edit")}</button>
            <DeleteCase id={id} />
          </div>
        </div>}
      </section>
    </div>
  );
}
