"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, FilePenLine, ListChecks } from "lucide-react";
import { useLocalized, useTranslation } from "@/i18n/use-translation";
import { useMessageState } from "@/i18n/use-message-state";
import { message as describeMessage } from "@/i18n/message";
import { useSessionGeneration } from "@/hooks/use-app-services";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import { useResults } from "@/features/results/queries";
import { createLocalizedFeaturesResultsViewModels } from "@/features/results/view-models";
import { SourceEvidence } from "@/features/results/source-evidence";
import type { Results } from "@/features/results/schemas";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";
import { SupportLinks } from "./support-navigation";
import { supportApi } from "./api";
import { inquiryContext } from "./inquiry-context";
import type { InquiryInput } from "./schemas";
import styles from "./inquiry-screen.module.css";

export function InquiryScreen({ caseId }: { caseId: number }) {
  const generation = useSessionGeneration();
  return <InquiryEditor key={`${generation}:${caseId}`} caseId={caseId}/>;
}

function InquiryEditor({ caseId }: { caseId: number }) {
  const { translate } = useTranslation();
  const { displayScalar, fieldLabels, statusLabels } = useLocalized(createLocalizedFeaturesResultsViewModels);
  const s = useSessionScope();
  const removal = useCaseRemoval(caseId);
  const results = useResults(caseId, true);
  const items = [...(results.data?.items ?? [])].sort((a, b) => Number(b.sources.length > 0) - Number(a.sources.length > 0));
  const context = inquiryContext(results.data);
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({ key: "", ids: [] });
  const selectedIds = context?.key === selection.key ? selection.ids : [];
  const selectionReset = !!selection.ids.length && !!context && context.key !== selection.key;
  const selectionDisabled = results.isFetching || !context?.ready;
  const canGenerate = !!context?.ready && results.isSuccess && !results.isFetching && selectedIds.length > 0 && selectedIds.length <= 50 && s.enabled && !removal.pending && !removal.removed;
  const [text, setText] = useState("");
  const [origin, setOrigin] = useMessageState(translate("caseSupport.inquiryScreen_inquiryEditor"));
  const [message, setMessage] = useMessageState("");
  const [confirm, setConfirm] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const lock = useRef(false);
  const mutation = useMutation({ gcTime: 0, mutationFn: (input: InquiryInput) => supportApi(s.api).inquiry(caseId, input) });

  function choose(ids: string[]) {
    if (!context || selectionDisabled || mutation.isPending) return;
    setSelection({ key: context.key, ids });
  }
  async function generate() {
    if (lock.current) return;
    setConfirm(false);
    if (!canGenerate || !context) { setMessage(describeMessage("caseSupport.inquiryAnalysis_chooseAgain")); return; }
    const input: InquiryInput = { resultItemIds: [...selectedIds], tone: "POLITE", basedOnResultVersions: { ...context.versions } };
    lock.current = true;
    try { await mutation.mutateAsync(input); } catch { /* Keep the direct editor available. */ }
    finally { lock.current = false; }
  }
  const error = mutation.error;

  return <div className={styles.page}>
    <header className={styles.hero}><div><p className={styles.eyebrow}>{translate("caseSupport.screens_company_inquiry_draft")}</p><h1>{translate("caseSupport.inquiryScreen_company_inquiry_review")}</h1><p>{translate("caseSupport.inquiryScreen_company_confirm_content_draft_review")}</p></div><span className={styles.heroIcon} aria-hidden="true"><FilePenLine size={44} strokeWidth={1.7}/></span></header>
    <SupportLinks caseId={caseId}/>

    <section className={styles.analysis} aria-labelledby="inquiry-analysis-title">
      <div className={styles.sectionHeading}><span className={styles.step}>01</span><h2 id="inquiry-analysis-title">{translate("caseSupport.inquiryAnalysis_title")}</h2></div>
      <p className={styles.description}>{translate("caseSupport.inquiryAnalysis_description")}</p>
      {results.isPending ? <QueryFeedback pending/> : results.isError ? <QueryFeedback error={results.error} retry={() => void results.refetch()}/> : <>
        {!context?.ready && <p className={styles.warning} role="status">{translate("caseSupport.inquiryAnalysis_notCurrent")} <Link href={`/cases/${caseId}/result`}>{translate("caseSupport.inquiryScreen_calculation_result")}</Link></p>}
        {selectionReset && <p className={styles.warning} role="status">{translate("caseSupport.inquiryAnalysis_chooseAgain")}</p>}
        {!items.length ? <div className={styles.empty}><ListChecks size={30} aria-hidden="true"/><h3>{translate("caseSupport.inquiryAnalysis_empty")}</h3><p>{translate("caseSupport.inquiryAnalysis_emptyHelp")}</p><Link href={`/cases/${caseId}/review`}>{translate("caseSupport.screens_document_review")}</Link></div> : <>
          <div className={styles.toolbar}><p role="status">{translate("caseSupport.inquiryAnalysis_count", { count: selectedIds.length })}</p><div><button type="button" disabled={selectionDisabled || mutation.isPending} onClick={() => choose(items.slice(0, 50).map(item => item.id))}>{translate("caseSupport.inquiryAnalysis_selectAll")}</button><button type="button" disabled={!selectedIds.length || mutation.isPending} onClick={() => choose([])}>{translate("caseSupport.clearSelection")}</button></div></div>
          <div className={styles.resultList}>{items.map((item, index) => {
            const checked = selectedIds.includes(item.id);
            return <article key={item.id} className={styles.resultCard} data-selected={checked}>
              <div className={styles.resultTop}><label htmlFor={`inquiry-topic-${index}`}><input id={`inquiry-topic-${index}`} type="checkbox" aria-label={item.title} checked={checked} disabled={selectionDisabled || mutation.isPending || (!checked && selectedIds.length >= 50)} onChange={e => choose(e.target.checked ? [...selectedIds, item.id] : selectedIds.filter(id => id !== item.id))}/><strong>{item.title}</strong></label><span className={styles.status} data-status={item.status}>{statusLabels[item.status] ?? item.status}</span></div>
              <p className={styles.period}>{item.periodStart} ~ {item.periodEnd}</p>
              <dl className={styles.values}>{(["calculatedValue", "documentValue", "difference"] as const).map(key => <div key={key}><dt>{fieldLabels[key]}</dt><dd>{displayScalar(item[key], key, item.unit)}</dd></div>)}</dl>
              {item.nextAction && <p className={styles.nextAction}>{item.nextAction}</p>}
              <InquiryEvidence caseId={caseId} sources={item.sources}/>
            </article>;
          })}</div>
        </>}
      </>}
    </section>

    <section className={styles.generation} aria-labelledby="inquiry-generation-title">
      <div className={styles.sectionHeading}><span className={styles.step}>02</span><h2 id="inquiry-generation-title">{translate("caseSupport.inquiryAnalysis_generateTitle")}</h2></div>
      <p id="inquiry-generation-help">{translate(selectedIds.length ? "caseSupport.inquiryAnalysis_generateHelp" : "caseSupport.inquiryAnalysis_chooseHelp")}</p>
      {results.data && <p className={styles.basis}>{translate("caseSupport.inquiryAnalysis_basis", { value1: results.data.resultVersion })}</p>}
      <button className={`${primaryButton} ${styles.generateButton}`} aria-describedby="inquiry-generation-help" disabled={!canGenerate || mutation.isPending} onClick={() => { if (text || mutation.data) setConfirm(true); else void generate(); }}>{mutation.isPending ? translate("caseSupport.inquiryScreen_draft") : mutation.data ? translate("caseSupport.inquiryScreen_draft_2") : translate("caseSupport.inquiryScreen_draft_3")}<ArrowRight size={18} aria-hidden="true"/></button>
      {error && <><QueryFeedback error={error}/><p role="alert">{error instanceof ApiError && error.errorCode === "REPORT_SOURCE_STALE" ? translate("caseSupport.inquiryScreen_result_current_status_update_retry") : error instanceof ApiError && (error.status === 503 || error.errorCode === "UPSTREAM_UNAVAILABLE") ? translate("caseSupport.inquiryScreen_use_count_empty_retry") : translate("caseSupport.inquiryScreen_draft_failure_use_count")}</p>{error instanceof ApiError && error.errorCode === "REPORT_SOURCE_STALE" && <button className={secondaryButton} onClick={() => void results.refetch()}>{translate("caseSupport.inquiryAnalysis_refresh")}</button>}</>}
    </section>
    {confirm && <ConfirmDialog title={translate("caseSupport.inquiryScreen_draft_retry")} onClose={() => setConfirm(false)} action={<button className={secondaryButton} disabled={!canGenerate || mutation.isPending} onClick={() => void generate()}>{translate("caseSupport.inquiryScreen_action")}</button>}><p>{translate("caseSupport.inquiryScreen_previous_draft_new_applicable_required_content")}</p></ConfirmDialog>}

    {mutation.data && <section className={`${cardStyle} ${styles.original}`} aria-label={translate("caseSupport.inquiryScreen_original")}><h2>{translate("caseSupport.inquiryScreen_original")}</h2><p className={styles.draftText}>{mutation.data.text}</p><p>{translate("caseSupport.applyDraftHelp")}</p><p>{translate("caseSupport.inquiryAnalysis_generatedCount", { count: mutation.variables?.resultItemIds?.length ?? 0 })}</p>{!mutation.data.text.trim() && <p role="status">{translate("caseSupport.emptyDraft")}</p>}<p>{mutation.data.requiresUserReview === true ? translate("caseSupport.inquiryScreen_user_review_count") : mutation.data.requiresUserReview === false ? translate("caseSupport.inquiryScreen_user_review_use") : translate("caseSupport.inquiryScreen_review_notProvided_use_confirm")}</p><button className={secondaryButton} disabled={!mutation.data.text.trim() || mutation.isPending} onClick={() => { if (text) setMessage(describeMessage("caseSupport.inquiryScreen_confirm_draft_applicable_count")); else { setText(mutation.data!.text); setOrigin(describeMessage("caseSupport.inquiryScreen_draft_user")); } }}>{translate("caseSupport.inquiryScreen_draft_4")}</button>{text && <button className={secondaryButton} onClick={() => setReplaceOpen(true)}>{translate("caseSupport.inquiryScreen_confirm")}</button>}</section>}

    <section className={`${cardStyle} ${styles.editor}`} aria-label={translate("caseSupport.inquiryScreen_current")}>
      <div className={styles.sectionHeading}><span className={styles.step}>03</span><h2>{translate("caseSupport.inquiryAnalysis_editTitle")}</h2></div>
      <p className={styles.description}>{translate("caseSupport.inquiryScreen_draft_review_edit_company")}</p>
      <Textarea id="inquiry-text" label={origin} className="min-h-60" value={text} onChange={e => { setText(e.target.value); setMessage(""); }}/>
      <button className={primaryButton} disabled={!text.trim()} onClick={async () => { try { await navigator.clipboard.writeText(text); setMessage(describeMessage("caseSupport.inquiryScreen_onClick_button")); } catch { setMessage(describeMessage("caseSupport.inquiryScreen_failure_select")); } }}>{translate("caseSupport.inquiryScreen_section")}</button>
      <p role="status">{message}</p><p className={styles.description}>{translate("caseSupport.inquiryScreen_confirm_unpaid_wage_content_save")}</p>
    </section>
    {replaceOpen && <ConfirmDialog title={translate("caseSupport.inquiryScreen_draft_5")} onClose={() => setReplaceOpen(false)} action={<button className={secondaryButton} onClick={() => { if (!replaceOpen || !mutation.data) return; setReplaceOpen(false); setText(mutation.data.text); setOrigin(describeMessage("caseSupport.inquiryScreen_draft_user")); setMessage(describeMessage("caseSupport.inquiryScreen_draft_use_content_review")); }}>{translate("caseSupport.inquiryScreen_action2")}</button>}><p>{translate("caseSupport.inquiryScreen_current_all_original_content_cancel")}</p></ConfirmDialog>}
  </div>;
}

function InquiryEvidence({ caseId, sources }: { caseId: number; sources: Results["items"][number]["sources"] }) {
  const { translate } = useTranslation();
  const [open, setOpen] = useState(false);
  return sources.length ? <details className={styles.evidence} onToggle={e => setOpen(e.currentTarget.open)}><summary>{translate("caseSupport.inquiryAnalysis_evidence")}</summary>{open && sources.map((source, i) => <SourceEvidence key={i} caseId={caseId} value={source} compact/>)}</details> : <p className={styles.noEvidence}>{translate("caseSupport.inquiryAnalysis_noEvidence")}</p>;
}
