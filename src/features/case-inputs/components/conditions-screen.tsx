"use client";
import {useMessageState} from '@/i18n/use-message-state';
import {message as describeMessage} from '@/i18n/message';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedLibApiFormErrors} from '@/lib/api/form-errors';
import {createLocalizedFeaturesCaseInputsConditionPresentation} from '../condition-presentation';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { DepositConnections } from "@/features/payments/deposit-connections";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import {Controller, useWatch} from 'react-hook-form';
import {useForm} from '@/i18n/use-localized-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, FileText } from "lucide-react";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { ApiError } from "@/lib/api/error";

import { useConditions, useInputAction } from "../queries";
import { type Condition, type Conditions } from "../schemas";
import {editableCondition} from "../condition-presentation";
import { ConditionDuration } from "./condition-duration";
import styles from "./conditions-screen.module.css";

type Phase = "overview" | "questions" | "review" | "saved";
const needsAnswer = (condition: Condition) => editableCondition(condition) && condition.status === "REQUIRED";

export function ConditionsScreen({ caseId }: { caseId: number }) {
 const {translate} = useTranslation();

  const owner = useCase(caseId); const removal = useCaseRemoval(caseId); const query = useConditions(caseId);
  if (removal.pending || removal.removed) return <p role="status">{translate("caseInputs.conditionsScreen_delete")}</p>;
  if (owner.isPending || query.isPending) return <QueryFeedback pending />;
  if ((owner.isError && !owner.data) || (query.isError && !query.data)) return <QueryFeedback error={owner.error ?? query.error} retry={() => { void owner.refetch(); void query.refetch(); }} />;
  return <><ConditionsForm key={caseId} caseId={caseId} initial={query.data!} reload={async () => { const result = await query.refetch(); if (result.isError || !result.data) throw result.error; return result.data; }} /><DepositConnections caseId={caseId}/></>;
}

export function ConditionsForm({ caseId, initial, reload }: { caseId: number; initial: Conditions; reload: () => Promise<Conditions> }) {
const {businessErrorMessage} = useLocalized(createLocalizedLibApiFormErrors);
const {answerLabel, conditionAnswer, conditionCheckLabels, conditionExplanation, conditionTitle, conditionValues, editableCondition} = useLocalized(createLocalizedFeaturesCaseInputsConditionPresentation);

 const {translate, translateContent} = useTranslation();

  const initialQuestions = initial.conditions.map((condition, index) => needsAnswer(condition) ? index : -1).filter(index => index >= 0);
  const [base, setBase] = useState(initial);
  const [phase, setPhase] = useState<Phase>(initialQuestions.length === 1 ? "questions" : "overview");
  const [page, setPage] = useState(initialQuestions[0] ?? 0);
  const [editing, setEditing] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useMessageState("");
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [resetEpoch, setResetEpoch] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null), errorSummary = useRef<HTMLParagraphElement>(null);
  const lock = useRef(false), allowLeave = useRef(false), saveToResult = useRef(false);
  const router = useRouter(); const id = useId(); const mutation = useInputAction(caseId);
  const schema = z.object({ values: z.record(z.string(), z.string()) }).superRefine(({ values }, context) => {
    for (const condition of base.conditions.filter(editableCondition)) {
      const value = values[condition.conditionId] ?? "";
      if (value === String(condition.value ?? "") && (!needsAnswer(condition) || value === "")) continue;
      if (value.trim() === "" || (condition.type === "NUMBER" && value !== "UNKNOWN" && !/^\d+$/.test(value)) || !conditionAnswer(condition, value).success) {
        context.addIssue({ code: "custom", path: ["values", condition.conditionId], message: condition.type === "NUMBER" ? describeMessage("caseInputs.conditionsScreen_time_atLeast_count_minutes_input_sum") : describeMessage("caseInputs.conditionsScreen_answer_select") });
      }
    }
  });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { values: conditionValues(base) } });
  const { control, handleSubmit, reset, trigger, setError, setFocus, formState: { errors, isSubmitting, isDirty } } = form;
  const values = useWatch({ control, name: "values" });
  const hasDraft = isDirty || confirmedIds.length > 0;
  const questions = base.conditions.map((condition, index) => needsAnswer(condition) ? index : -1).filter(index => index >= 0);
  const current = base.conditions[page];
  const disabled = isSubmitting || conflict;
  const title = phase === "questions" && current ? conditionTitle(current) : phase === "review" ? translate("caseInputs.conditionsScreen_content_confirm") : phase === "saved" ? translate("caseInputs.conditionsScreen_save") : base.conditions.length === 0 ? translate("caseInputs.conditionsScreen_add_confirm_empty") : questions.length ? translate("caseInputs.conditionsScreen_wage_confirm") : translate("caseInputs.conditionsScreen_conditionsForm_title5");

  useLayoutEffect(() => { heading.current?.focus(); }, [phase, page]);
  useLayoutEffect(() => {
    if (isSubmitting) return;
    const key = Object.keys(errors.values ?? {})[0];
    if (key && phase === "questions" && current?.conditionId === key) setFocus(`values.${key}`);
    else if (errors.root?.server) errorSummary.current?.focus();
  }, [errors, isSubmitting, current?.conditionId, phase, setFocus]);
  useEffect(() => {
    if (!hasDraft) return;
    const message = translate("caseInputs.conditionsScreen_save_answer");
    function beforeUnload(event: BeforeUnloadEvent) { if (!allowLeave.current) { event.preventDefault(); event.returnValue = ""; } }
    function leavingLink(event: MouseEvent) {
      if (allowLeave.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const target = new URL(link.href, window.location.href);
      if (target.pathname === window.location.pathname && target.search === window.location.search) return;
      if (!window.confirm(message)) { event.preventDefault(); event.stopPropagation(); }
    }
    function traverse(event: Event) {
      if (allowLeave.current || !("navigationType" in event) || event.navigationType !== "traverse" || !event.cancelable) return;
      if (!window.confirm(message)) event.preventDefault();
    }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", leavingLink, true); navigation?.addEventListener("navigate", traverse);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", leavingLink, true); navigation?.removeEventListener("navigate", traverse); };
  }, [hasDraft, translate]);

  async function refresh() {
    const latest = await reload(); setBase(latest); reset({ values: conditionValues(latest) }); setConfirmedIds([]); setResetEpoch(previous => previous + 1); setConflict(false); setEditing(false); setPhase("review"); setNotice(describeMessage("caseInputs.conditionsScreen_current_question_answer_loaded"));
  }
  async function nextQuestion() {
    if (!current || !values[current.conditionId] || !await trigger(`values.${current.conditionId}`)) return;
    if (needsAnswer(current)) setConfirmedIds(previous => previous.includes(current.conditionId) ? previous : [...previous, current.conditionId]);
    if (editing) { setEditing(false); setPhase("review"); return; }
    const next = questions[questions.indexOf(page) + 1];
    if (next === undefined) setPhase("review"); else setPage(next);
  }
  function openQuestion(index: number) { setPage(index); setEditing(true); setPhase("questions"); }
  const save = (event: FormEvent<HTMLFormElement>) => handleSubmit(async ({ values: submitted }) => {
    if (lock.current || conflict) return; lock.current = true; setNotice("");
    let accepted = false;
    const answers = base.conditions.filter(condition => editableCondition(condition) && (confirmedIds.includes(condition.conditionId) || submitted[condition.conditionId] !== String(condition.value ?? ""))).map(condition => {
      const parsed = conditionAnswer(condition, submitted[condition.conditionId]);
      if (!parsed.success) throw new Error("Invalid condition answer");
      return parsed.data;
    });
    try {
      if (answers.length) {
        await mutation.mutateAsync({ type: "conditions", body: { answers, expectedInputVersion: base.inputVersion } }); accepted = true;
        await refresh(); setNotice(describeMessage("caseInputs.conditionsScreen_change_save_check_status_automatic_update"));
      }
      if (saveToResult.current) { allowLeave.current = true; router.push(`/cases/${caseId}/result`); }
      else setPhase("saved");
    } catch (error) {
      if (accepted) { setConflict(true); setError("root.server", { message: describeMessage("caseInputs.conditionsScreen_save_current_question_failure_retry_answer") }); return; }
      if (error instanceof ApiError && error.errorCode === "INPUT_VERSION_CONFLICT") setConflict(true);
      let firstInvalid: string | undefined;
      if (error instanceof ApiError && error.status === 422) for (const issue of error.fieldErrors) {
        const index = Number(issue.field.match(/answers\.(\d+)/)?.[1]);
        const key = Number.isInteger(index) ? answers[index]?.conditionId : base.conditions.find(condition => issue.field.includes(condition.conditionId))?.conditionId;
        if (key) { setError(`values.${key}`, { message: issue.reason }); firstInvalid ??= key; }
      }
      if (firstInvalid) { setPage(base.conditions.findIndex(condition => condition.conditionId === firstInvalid)); setEditing(true); setPhase("questions"); }
      setError("root.server", { message: businessErrorMessage(error) });
    } finally { lock.current = false; }
  }, invalid => {
    const key = Object.keys(invalid.values ?? {})[0];
    if (key) { setPage(base.conditions.findIndex(condition => condition.conditionId === key)); setEditing(true); setPhase("questions"); }
  })(event);

  return <div className={styles.screen}>
    <form data-condition-flow noValidate aria-label={translate("caseInputs.conditionsScreen_calculation")} onSubmit={event => {
      if (phase !== "review") { event.preventDefault(); if (phase === "questions") void nextQuestion(); return; }
      void save(event);
    }}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{translateContent("caseInputs.conditionsScreen_calculation_confirm", { value1: phase === "questions" && !editing && <span>{translate("caseInputs.conditionsScreen_question", { value1: questions.indexOf(page) + 1, value2: questions.length })}</span> })}</p>
        {phase === "questions" && !editing && <progress className={styles.progress} aria-label={translate("caseInputs.conditionsScreen_question_progress")} value={questions.indexOf(page)} max={questions.length} />}
        <h1 ref={heading} tabIndex={-1} id={`${id}-title`}>{title}</h1>
        {phase === "overview" && <p>{translate("caseInputs.conditionsScreen_record_confirm_content")}<br />{translate("caseInputs.conditionsScreen_content_confirm_2")}</p>}
        {phase === "questions" && current && <p>{conditionExplanation(current)}</p>}
        {phase === "review" && <p>{translate("caseInputs.conditionsScreen_content")}<br />{translate("caseInputs.conditionsScreen_content_save_result")}</p>}
        {phase === "saved" && <p>{translate("caseInputs.conditionsScreen_calculation_count_scope_record")}<br />{translate("caseInputs.conditionsScreen_current_result_confirm")}</p>}
      </header>

      {(phase === "overview" || phase === "review" || phase === "saved") && <>
        <ul className={styles.answerList} aria-label={translate("caseInputs.conditionsScreen_calculation_list")}>{base.conditions.map((condition, index) => <li key={condition.conditionId}>
          <div><p className={styles.answerTitle}>{conditionTitle(condition)}</p><p className={styles.answerValue}>{needsAnswer(condition) && condition.value !== null && !confirmedIds.includes(condition.conditionId) && values[condition.conditionId] === String(condition.value) && translate("caseInputs.conditionsScreen_confirm_required_candidate")}{answerLabel(condition, values[condition.conditionId] ?? "")}{(confirmedIds.includes(condition.conditionId) || values[condition.conditionId] !== String(condition.value ?? "")) && <span className={styles.draft}>{translate("caseInputs.conditionsScreen_save_2")}</span>}</p>{!editableCondition(condition) && condition.status !== "NOT_APPLICABLE" && <p className={styles.hint}>{translate("caseInputs.conditionsScreen_current_answer_count_none_question_record_confirm")}</p>}</div>
          {editableCondition(condition) && <button type="button" className={styles.textButton} disabled={disabled} aria-label={translate("caseInputs.conditionsScreen_edit", { value1: conditionTitle(condition) })} onClick={() => openQuestion(index)}>{translate("common.edit")}</button>}
        </li>)}</ul>
        {base.conditions.length === 0 && <p className={styles.note}>{translate("caseInputs.conditionsScreen_add_question_empty_calculation_required_record_insufficient")}</p>}
        {phase === "review" && <p className={styles.note}>{translate("caseInputs.conditionsScreen_all_question_calculation_count_save_check_status")}</p>}
      </>}

      {base.conditions.map((condition, index) => {
        const visible = phase === "questions" && index === page;
        const fieldId = `${id}-${condition.conditionId}`;
        const readOnly = !editableCondition(condition);
        const error = errors.values?.[condition.conditionId]?.message;
        return <section key={`${condition.conditionId}-${base.inputVersion}-${resetEpoch}`} hidden={!visible} aria-label={translate("caseInputs.conditionsScreen_ariaLabel_section", { value1: conditionTitle(condition) })} className={styles.question}>
          {needsAnswer(condition) && condition.value !== null && !confirmedIds.includes(condition.conditionId) && <p className={styles.candidate}>{translate("caseInputs.conditionsScreen_record_candidate")}{answerLabel(condition, String(condition.value))}<br />{translate("caseInputs.conditionsScreen_confirm_content_next_navigate")}</p>}
          <Controller name={`values.${condition.conditionId}`} control={control} render={({ field }) => condition.type === "NUMBER" && !readOnly ? <ConditionDuration id={fieldId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} disabled={disabled} error={error} /> : condition.type === "SELECT" || condition.type === "BOOLEAN" ? <fieldset className={styles.choices} disabled={disabled || readOnly} aria-label={conditionTitle(condition)} aria-describedby={error ? `${fieldId}-error` : undefined}>
            <legend className="sr-only">{conditionTitle(condition)}</legend>
            {(condition.type === "BOOLEAN" ? ["true", "false", "UNKNOWN"] : condition.options ?? []).map((option, optionIndex) => {
              const comparison = condition.conditionId !== "base_scope_confirmed";
              const label = option === "UNKNOWN" ? translate("caseInputs.conditionsScreen_label_fieldset") : option === "true" ? comparison ? translate("caseInputs.conditionsScreen_basis") : translate("caseInputs.conditionsScreen_confirm") : option === "false" ? comparison ? translate("caseInputs.conditionsScreen_basis_2") : translate("caseInputs.conditionsScreen_confirm_failure") : ({ LESS_THAN_5: translate("caseInputs.conditionsScreen_label_lESSTHAN5_fieldset"), AT_LEAST_5: translate("caseInputs.conditionsScreen_atLeast") } as Record<string, string>)[option] ?? option;
              return <label className={styles.choice} key={option}><input ref={optionIndex === 0 ? field.ref : undefined} type="radio" name={field.name} value={option} checked={field.value === option} onBlur={field.onBlur} onChange={() => field.onChange(option)} /><span>{label}</span>{field.value === option && <Check size={19} aria-hidden="true" />}</label>;
            })}
          </fieldset> : <input ref={field.ref} className="ui-control" aria-label={condition.question} value={field.value} disabled readOnly />} />
          {condition.type !== "NUMBER" && error && <p className={styles.error} id={`${fieldId}-error`} role="alert">{error}</p>}
          {condition.conditionId === "workplace_size" && <details className={styles.help}><summary>{translate("caseInputs.conditionsScreen_work_count")}</summary><p>{translate("caseInputs.conditionsScreen_current_count_select")}</p></details>}
          <div className={styles.source}>
            <p><FileText size={17} aria-hidden="true" />{translate("caseInputs.conditionsScreen_confirm_record")}</p>
            {condition.source ? <blockquote>{condition.source}</blockquote> : <p className={styles.hint}>{translate("caseInputs.conditionsScreen_question_link_original_evidence_empty_record_confirm")}</p>}
            <Link href={`/cases/${caseId}/review`}>{translate("caseInputs.conditionsScreen_original_confirm")}<ArrowRight size={15} aria-hidden="true" /></Link>
            {condition.requiredFor.length > 0 && <p className={styles.hint}>{translate("caseInputs.conditionsScreen_answer_use_check", { value1: condition.requiredFor.map(key => conditionCheckLabels[key] ?? translate("caseInputs.conditionsScreen_add_check")).join(", ") })}</p>}
          </div>
        </section>;
      })}

      {conflict && <p role="alert" className={styles.error}>{translate("caseInputs.conditionsScreen_current_input_save_stop_answer_question_loaded")}</p>}
      {errors.root?.server && <p role="alert" ref={errorSummary} tabIndex={-1} className={styles.error}>{errors.root.server.message}</p>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      <footer className={styles.footer}>
        {hasDraft && <p className={styles.hint}>{translate("caseInputs.conditionsScreen_save_answer_question_navigate")}</p>}
        {phase === "overview" && (questions.length ? <button type="button" className={styles.primary} onClick={() => { setPage(questions[0]); setEditing(false); setPhase("questions"); }}>{translate("caseInputs.conditionsScreen_confirm_2")}<ArrowRight size={19} aria-hidden="true" /></button> : base.conditions.length ? <button type="button" className={styles.primary} onClick={() => setPhase("review")}>{translate("caseInputs.conditionsScreen_answer_review")}</button> : <Link href={`/cases/${caseId}/result`} className={styles.primary}>{translate("caseInputs.conditionsScreen_result_confirm")}</Link>)}
        {phase === "questions" && <>
          <p className={styles.hint}>{translate("caseInputs.conditionsScreen_answer_save")}</p>
          <button type="button" className={styles.primary} disabled={disabled || !current || !editableCondition(current) || !values[current.conditionId]} onClick={() => { void nextQuestion(); }}>{editing ? translate("caseInputs.conditionsScreen_review") : questions.indexOf(page) === questions.length - 1 ? translate("caseInputs.conditionsScreen_answer_review") : translate("common.next")}<ArrowRight size={19} aria-hidden="true" /></button>
          <div className={styles.footerLinks}>{!editing && questions.indexOf(page) > 0 && <button type="button" className={styles.textButton} disabled={isSubmitting} onClick={() => setPage(questions[questions.indexOf(page) - 1])}><ArrowLeft size={16} aria-hidden="true" />{translate("common.previous")}</button>}<button type="button" className={styles.textButton} disabled={isSubmitting} onClick={() => { setEditing(false); setPhase("review"); }}>{translate("caseInputs.conditionsScreen_answer_review_2")}</button></div>
        </>}
        {phase === "review" && <>
          {hasDraft ? <><button type="submit" className={styles.primary} disabled={disabled} onClick={() => { saveToResult.current = true; }}>{isSubmitting ? translate("caseInputs.conditionsScreen_save_3") : translate("caseInputs.conditionsScreen_answer_save_result")}<ArrowRight size={19} aria-hidden="true" /></button><button type="submit" className={styles.textButton} disabled={disabled} onClick={() => { saveToResult.current = false; }}>{translate("caseInputs.conditionsScreen_save_4")}</button></> : <Link href={`/cases/${caseId}/result`} className={styles.primary}>{translate("caseInputs.conditionsScreen_result_confirm")}<ArrowRight size={19} aria-hidden="true" /></Link>}
          <button type="button" className={styles.textButton} disabled={isSubmitting} onClick={() => setPhase("overview")}>{translate("caseInputs.conditionsScreen_all")}</button>
        </>}
        {phase === "saved" && <><Link href={`/cases/${caseId}/result`} className={styles.primary}>{translate("caseInputs.conditionsScreen_result_confirm")}<ArrowRight size={19} aria-hidden="true" /></Link><button type="button" className={styles.textButton} onClick={() => setPhase("review")}>{translate("caseInputs.conditionsScreen_answer_retry")}</button></>}
        {(conflict || errors.root?.server) && <button className={styles.textButton} type="button" disabled={isSubmitting} onClick={() => { if (!hasDraft || window.confirm(translate("caseInputs.conditionsScreen_draft_current_question_answer"))) void refresh().catch(error => setError("root.server", { message: businessErrorMessage(error) })); }}>{translate("caseInputs.conditionsScreen_current_question_answer_retry_load")}</button>}
      </footer>
    </form>
  </div>;
}
