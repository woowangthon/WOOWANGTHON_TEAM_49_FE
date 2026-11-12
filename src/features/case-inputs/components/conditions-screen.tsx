"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, FileText } from "lucide-react";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { ApiError } from "@/lib/api/error";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { useConditions, useInputAction } from "../queries";
import { type Condition, type Conditions } from "../schemas";
import { answerLabel, conditionAnswer, conditionCheckLabels, conditionExplanation, conditionTitle, conditionValues, editableCondition } from "../condition-presentation";
import { ConditionDuration } from "./condition-duration";
import styles from "./conditions-screen.module.css";

type Phase = "overview" | "questions" | "review" | "saved";
const needsAnswer = (condition: Condition) => editableCondition(condition) && condition.status === "REQUIRED";

export function ConditionsScreen({ caseId }: { caseId: number }) {
  const owner = useCase(caseId); const removal = useCaseRemoval(caseId); const query = useConditions(caseId);
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 사례입니다.</p>;
  if (owner.isPending || query.isPending) return <QueryFeedback pending />;
  if ((owner.isError && !owner.data) || (query.isError && !query.data)) return <QueryFeedback error={owner.error ?? query.error} retry={() => { void owner.refetch(); void query.refetch(); }} />;
  return <ConditionsForm key={caseId} caseId={caseId} initial={query.data!} reload={async () => { const result = await query.refetch(); if (result.isError || !result.data) throw result.error; return result.data; }} />;
}

export function ConditionsForm({ caseId, initial, reload }: { caseId: number; initial: Conditions; reload: () => Promise<Conditions> }) {
  const initialQuestions = initial.conditions.map((condition, index) => needsAnswer(condition) ? index : -1).filter(index => index >= 0);
  const [base, setBase] = useState(initial);
  const [phase, setPhase] = useState<Phase>(initialQuestions.length === 1 ? "questions" : "overview");
  const [page, setPage] = useState(initialQuestions[0] ?? 0);
  const [editing, setEditing] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
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
        context.addIssue({ code: "custom", path: ["values", condition.conditionId], message: condition.type === "NUMBER" ? "시간은 0 이상의 정수, 분은 0~59로 입력해 주세요. 합계는 1,000,000분까지 입력할 수 있어요." : "답변을 선택하거나 잘 모르겠어요를 선택해 주세요." });
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
  const title = phase === "questions" && current ? conditionTitle(current) : phase === "review" ? "알려주신 내용을 확인해 주세요" : phase === "saved" ? "조건을 저장했어요" : base.conditions.length === 0 ? "추가로 확인할 조건이 없어요" : questions.length ? "급여를 살펴보기 전에 몇 가지만 확인할게요" : "알려주신 조건을 살펴볼까요?";

  useLayoutEffect(() => { heading.current?.focus(); }, [phase, page]);
  useLayoutEffect(() => {
    if (isSubmitting) return;
    const key = Object.keys(errors.values ?? {})[0];
    if (key && phase === "questions" && current?.conditionId === key) setFocus(`values.${key}`);
    else if (errors.root?.server) errorSummary.current?.focus();
  }, [errors, isSubmitting, current?.conditionId, phase, setFocus]);
  useEffect(() => {
    if (!hasDraft) return;
    const message = "저장하지 않은 답변이 있어요. 이 화면을 나갈까요?";
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
  }, [hasDraft]);

  async function refresh() {
    const latest = await reload(); setBase(latest); reset({ values: conditionValues(latest) }); setConfirmedIds([]); setResetEpoch(previous => previous + 1); setConflict(false); setEditing(false); setPhase("review"); setNotice("최신 질문과 답변을 불러왔습니다.");
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
        await refresh(); setNotice("변경된 조건을 저장했습니다. 서버가 관련 검사 상태를 자동 갱신합니다.");
      }
      if (saveToResult.current) { allowLeave.current = true; router.push(`/cases/${caseId}/result`); }
      else setPhase("saved");
    } catch (error) {
      if (accepted) { setConflict(true); setError("root.server", { message: "조건은 저장했지만 최신 질문 조회에 실패했습니다. 다시 저장하지 말고 최신 질문·답변을 불러와 주세요." }); return; }
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
    <form data-condition-flow noValidate aria-label="계산 조건 폼" onSubmit={event => {
      if (phase !== "review") { event.preventDefault(); if (phase === "questions") void nextQuestion(); return; }
      void save(event);
    }}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>계산 전 확인{phase === "questions" && !editing && <span>질문 {questions.indexOf(page) + 1} / {questions.length}</span>}</p>
        {phase === "questions" && !editing && <progress className={styles.progress} aria-label="조건 질문 진행" value={questions.indexOf(page)} max={questions.length} />}
        <h1 ref={heading} tabIndex={-1} id={`${id}-title`}>{title}</h1>
        {phase === "overview" && <p>자료에서 확인되지 않은 내용만 물어볼게요.<br />모르는 내용은 나중에 확인해도 괜찮아요.</p>}
        {phase === "questions" && current && <p>{conditionExplanation(current)}</p>}
        {phase === "review" && <p>모르는 내용은 그대로 두어도 괜찮아요.<br />아는 내용부터 저장하고 가능한 결과를 살펴보세요.</p>}
        {phase === "saved" && <p>계산할 수 있는 범위는 자료와 조건에 따라 달라요.<br />최신 결과와 남은 확인 사항을 살펴보세요.</p>}
      </header>

      {(phase === "overview" || phase === "review" || phase === "saved") && <>
        <ul className={styles.answerList} aria-label="계산 조건 목록">{base.conditions.map((condition, index) => <li key={condition.conditionId}>
          <div><p className={styles.answerTitle}>{conditionTitle(condition)}</p><p className={styles.answerValue}>{needsAnswer(condition) && condition.value !== null && !confirmedIds.includes(condition.conditionId) && values[condition.conditionId] === String(condition.value) && "확인 필요 · 후보: "}{answerLabel(condition, values[condition.conditionId] ?? "")}{(confirmedIds.includes(condition.conditionId) || values[condition.conditionId] !== String(condition.value ?? "")) && <span className={styles.draft}> · 미저장</span>}</p>{!editableCondition(condition) && condition.status !== "NOT_APPLICABLE" && <p className={styles.hint}>현재 화면에서는 답변할 수 없는 질문이에요. 자료 확인은 계속할 수 있어요.</p>}</div>
          {editableCondition(condition) && <button type="button" className={styles.textButton} disabled={disabled} aria-label={`${conditionTitle(condition)} 수정`} onClick={() => openQuestion(index)}>수정</button>}
        </li>)}</ul>
        {base.conditions.length === 0 && <p className={styles.note}>추가 질문이 없어도 계산에 필요한 자료가 부족할 수 있어요. 결과에서 확인 가능한 범위를 살펴보세요.</p>}
        {phase === "review" && <p className={styles.note}>모든 질문에 답해도 계산이 보류될 수 있어요. 조건을 저장하면 서버가 관련 검사 상태를 갱신해요.</p>}
      </>}

      {base.conditions.map((condition, index) => {
        const visible = phase === "questions" && index === page;
        const fieldId = `${id}-${condition.conditionId}`;
        const readOnly = !editableCondition(condition);
        const error = errors.values?.[condition.conditionId]?.message;
        return <section key={`${condition.conditionId}-${base.inputVersion}-${resetEpoch}`} hidden={!visible} aria-label={`${conditionTitle(condition)} 조건`} className={styles.question}>
          {needsAnswer(condition) && condition.value !== null && !confirmedIds.includes(condition.conditionId) && <p className={styles.candidate}>자료의 후보값: {answerLabel(condition, String(condition.value))}<br />아직 확인하지 않은 값이에요. 내용을 살펴본 뒤 다음으로 이동해 주세요.</p>}
          <Controller name={`values.${condition.conditionId}`} control={control} render={({ field }) => condition.type === "NUMBER" && !readOnly ? <ConditionDuration id={fieldId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} disabled={disabled} error={error} /> : condition.type === "SELECT" || condition.type === "BOOLEAN" ? <fieldset className={styles.choices} disabled={disabled || readOnly} aria-label={conditionTitle(condition)} aria-describedby={error ? `${fieldId}-error` : undefined}>
            <legend className="sr-only">{conditionTitle(condition)}</legend>
            {(condition.type === "BOOLEAN" ? ["true", "false", "UNKNOWN"] : condition.options ?? []).map((option, optionIndex) => {
              const comparison = condition.conditionId !== "base_scope_confirmed";
              const label = option === "UNKNOWN" ? "잘 모르겠어요" : option === "true" ? comparison ? "같은 기준이에요" : "예, 확인했어요" : option === "false" ? comparison ? "기준이 달라요" : "아니요, 확인하지 못했어요" : ({ LESS_THAN_5: "5인 미만", AT_LEAST_5: "5인 이상" } as Record<string, string>)[option] ?? option;
              return <label className={styles.choice} key={option}><input ref={optionIndex === 0 ? field.ref : undefined} type="radio" name={field.name} value={option} checked={field.value === option} onBlur={field.onBlur} onChange={() => field.onChange(option)} /><span>{label}</span>{field.value === option && <Check size={19} aria-hidden="true" />}</label>;
            })}
          </fieldset> : <input ref={field.ref} className="ui-control" aria-label={condition.question} value={field.value} disabled readOnly />} />
          {condition.type !== "NUMBER" && error && <p className={styles.error} id={`${fieldId}-error`} role="alert">{error}</p>}
          {condition.conditionId === "workplace_size" && <details className={styles.help}><summary>상시 근로자 수를 잘 모르겠다면</summary><p>현재 눈에 보이는 인원과 다를 수 있어요. 정확히 알기 어렵다면 ‘잘 모르겠어요’를 선택해 주세요.</p></details>}
          <div className={styles.source}>
            <p><FileText size={17} aria-hidden="true" />확인할 자료</p>
            {condition.source ? <blockquote>{condition.source}</blockquote> : <p className={styles.hint}>질문에 연결된 원문 근거가 아직 없어요. 자료를 확인하기 어렵다면 모름으로 남겨 주세요.</p>}
            <Link href={`/cases/${caseId}/review`}>원문 확인<ArrowRight size={15} aria-hidden="true" /></Link>
            {condition.requiredFor.length > 0 && <p className={styles.hint}>이 답변을 사용하는 검사: {condition.requiredFor.map(key => conditionCheckLabels[key] ?? "추가 검사").join(", ")}</p>}
          </div>
        </section>;
      })}

      {conflict && <p role="alert" className={styles.error}>최신 입력과 달라 저장을 중단했어요. 편집한 답변은 남아 있어요. 최신 질문·답변을 불러온 뒤 다시 확인해 주세요.</p>}
      {errors.root?.server && <p role="alert" ref={errorSummary} tabIndex={-1} className={styles.error}>{errors.root.server.message}</p>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      <footer className={styles.footer}>
        {hasDraft && <p className={styles.hint}>미저장 답변이 있어요. 질문 이동은 저장하지 않아요.</p>}
        {phase === "overview" && (questions.length ? <button type="button" className={styles.primary} onClick={() => { setPage(questions[0]); setEditing(false); setPhase("questions"); }}>조건 확인하기<ArrowRight size={19} aria-hidden="true" /></button> : base.conditions.length ? <button type="button" className={styles.primary} onClick={() => setPhase("review")}>답변 검토하기</button> : <Link href={`/cases/${caseId}/result`} className={styles.primary}>결과 확인</Link>)}
        {phase === "questions" && <>
          <p className={styles.hint}>답변은 마지막에 한 번에 저장해요.</p>
          <button type="button" className={styles.primary} disabled={disabled || !current || !editableCondition(current) || !values[current.conditionId]} onClick={() => { void nextQuestion(); }}>{editing ? "검토로 돌아가기" : questions.indexOf(page) === questions.length - 1 ? "답변 검토하기" : "다음"}<ArrowRight size={19} aria-hidden="true" /></button>
          <div className={styles.footerLinks}>{!editing && questions.indexOf(page) > 0 && <button type="button" className={styles.textButton} disabled={isSubmitting} onClick={() => setPage(questions[questions.indexOf(page) - 1])}><ArrowLeft size={16} aria-hidden="true" />이전</button>}<button type="button" className={styles.textButton} disabled={isSubmitting} onClick={() => { setEditing(false); setPhase("review"); }}>지금까지 답변 검토</button></div>
        </>}
        {phase === "review" && <>
          {hasDraft ? <><button type="submit" className={styles.primary} disabled={disabled} onClick={() => { saveToResult.current = true; }}>{isSubmitting ? "조건 저장 중…" : "답변 저장하고 결과 보기"}<ArrowRight size={19} aria-hidden="true" /></button><button type="submit" className={styles.textButton} disabled={disabled} onClick={() => { saveToResult.current = false; }}>조건만 저장</button></> : <Link href={`/cases/${caseId}/result`} className={styles.primary}>결과 확인<ArrowRight size={19} aria-hidden="true" /></Link>}
          <button type="button" className={styles.textButton} disabled={isSubmitting} onClick={() => setPhase("overview")}>전체 조건 보기</button>
        </>}
        {phase === "saved" && <><Link href={`/cases/${caseId}/result`} className={styles.primary}>결과 확인<ArrowRight size={19} aria-hidden="true" /></Link><button type="button" className={styles.textButton} onClick={() => setPhase("review")}>답변 다시 살펴보기</button></>}
        {(conflict || errors.root?.server) && <button className={styles.textButton} type="button" disabled={isSubmitting} onClick={() => { if (!hasDraft || window.confirm("편집 초안을 버리고 최신 질문과 답변을 불러올까요?")) void refresh().catch(error => setError("root.server", { message: businessErrorMessage(error) })); }}>최신 질문·답변 다시 불러오기</button>}
      </footer>
    </form>
  </div>;
}
