"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, FileCheck2, Info, ListChecks, NotebookPen, Settings2 } from "lucide-react";
import { useTranslation } from "@/i18n/use-translation";
import { useSessionGeneration } from "@/hooks/use-app-services";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { SupportLinks } from "./support-navigation";
import { useQuestions } from "./queries";
import styles from "./pre-consultation-screen.module.css";

export function QuestionsScreen({ caseId }: { caseId: number }) {
  const generation = useSessionGeneration();
  return <PreConsultationContent key={`${generation}:${caseId}`} caseId={caseId}/>;
}

function PreConsultationContent({ caseId }: { caseId: number }) {
  const { translate } = useTranslation();
  const [index, setIndex] = useState(0);
  const q = useQuestions(caseId);
  const count = q.data?.questions.length ?? 0;
  const activeIndex = Math.min(index, Math.max(0, count - 1));
  const item = q.data?.questions[activeIndex];
  const actions = [
    { path: "conditions", label: "caseSupport.screens_calculation_confirm", hint: "caseSupport.preCheck_conditionsHint", icon: Settings2 },
    { path: "manual-records", label: "caseSupport.screens_manual_record", hint: "caseSupport.preCheck_recordsHint", icon: NotebookPen },
    { path: "review", label: "caseSupport.screens_document_review", hint: "caseSupport.preCheck_documentsHint", icon: FileCheck2 },
  ] as const;

  return <div className={styles.page}>
    <Link href="/consultation" className={styles.back}><ArrowLeft size={17} aria-hidden="true"/>{translate("caseSupport.preCheck_back")}</Link>
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>{translate("caseSupport.consultationScreen_consultation")}</p><h1>{translate("caseSupport.screens_confirm_question_record")}</h1><p className={styles.description}>{translate("caseSupport.screens_question_consultation_required_content")}</p></div>
      <span className={styles.heroIcon} aria-hidden="true"><ListChecks size={49} strokeWidth={1.7}/></span>
    </header>
    <SupportLinks caseId={caseId}/>

    {q.isPending ? <QueryFeedback pending/> : q.isError ? <QueryFeedback error={q.error} retry={() => void q.refetch()}/> : !item ? <section className={styles.empty}>
      <span className={styles.emptyIcon}><Check size={30} aria-hidden="true"/></span>
      <h2>{translate("caseSupport.screens_provided_confirm_question_empty")}</h2>
      <p>{translate("caseSupport.preCheck_emptyDescription")}</p>
    </section> : <>
      <div className={styles.sectionHeading}><h2>{translate("caseSupport.questionList")}</h2><span role="status">{translate("caseSupport.questionCount", { count })}</span></div>
      <div className={`${styles.workspace} ${count === 1 ? styles.singleItem : ""}`}>
        {count > 1 && <nav className={styles.itemList} aria-label={translate("caseSupport.questionList")}>
          <ol>{q.data.questions.map((question, i) => <li key={question.questionId}>
            <button type="button" aria-label={`${i + 1}. ${question.question}`} aria-current={activeIndex === i ? "true" : undefined} onClick={() => setIndex(i)}>
              <span className={styles.itemNumber} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span>{question.question}</span><ChevronRight size={16} aria-hidden="true"/>
            </button>
          </li>)}</ol>
        </nav>}
        <div className={styles.detailColumn}>
          <article className={styles.detail} key={item.questionId}>
            <p className={styles.itemLabel}>{translate("caseSupport.preCheck_itemLabel")} <span>{String(activeIndex + 1).padStart(2, "0")}</span></p>
            <h2>{item.question}</h2>
            <section className={styles.reason} aria-labelledby={`pre-check-reason-${item.questionId}`}>
              <h3 id={`pre-check-reason-${item.questionId}`}><Info size={17} aria-hidden="true"/>{translate("caseSupport.preCheck_why")}</h3><p>{item.reason}</p>
            </section>
            <section className={styles.supplement}>
              <h3>{translate("caseSupport.preCheck_supplementTitle")}</h3><p>{translate("caseSupport.preCheck_supplementDescription")}</p>
              <div className={styles.actions}>{actions.map(({ path, label, hint, icon: Icon }) => <Link key={path} href={`/cases/${caseId}/${path}`} aria-label={translate(label)}>
                <span className={styles.actionIcon}><Icon size={21} aria-hidden="true"/></span><span><strong>{translate(label)}</strong><small>{translate(hint)}</small></span><ChevronRight size={18} aria-hidden="true"/>
              </Link>)}</div>
            </section>
            <details className={styles.metadata}><summary>{translate("caseSupport.screens_record_question_detail")}</summary><p>{translate("caseSupport.screens_item", { value1: item.type, value2: item.relatedItemId ?? translate("common.notProvided") })}</p></details>
          </article>
          <nav className={styles.pagination} aria-label={translate("cases.caseFocusNavigation_navigate", { value1: translate("caseSupport.inquiryScreen_confirm_question") })}>
            <p aria-live="polite">{translate("caseSupport.questionPosition", { current: activeIndex + 1, count })}</p>
            <div><button type="button" disabled={activeIndex === 0} onClick={() => setIndex(activeIndex - 1)}>{translate("common.previous")}</button><button type="button" disabled={activeIndex >= count - 1} onClick={() => setIndex(activeIndex + 1)}>{translate("common.next")}<ArrowRight size={16} aria-hidden="true"/></button></div>
          </nav>
        </div>
      </div>
    </>}
    <section className={styles.nextSteps} aria-labelledby="pre-check-next-title">
      <div><p className={styles.eyebrow}>{translate("caseSupport.consultationScreen_consultation")}</p><h2 id="pre-check-next-title">{translate("caseSupport.preCheck_nextTitle")}</h2></div>
      <div><Link href={`/cases/${caseId}/company-inquiry`}>{translate("caseSupport.preCheck_inquiryAction")}<ChevronRight size={18} aria-hidden="true"/></Link><Link href={`/cases/${caseId}/reports`} className={styles.primaryAction}>{translate("caseSupport.preCheck_reportAction")}<ArrowRight size={18} aria-hidden="true"/></Link></div>
    </section>
  </div>;
}
