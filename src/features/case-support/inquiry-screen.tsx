"use client";
import {useMessageState} from '@/i18n/use-message-state';
import {message as describeMessage} from '@/i18n/message';

import { useTranslation } from '@/i18n/use-translation';

import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";
import { supportApi } from "./api";
import { useSessionGeneration } from "@/hooks/use-app-services";

export function InquiryScreen({ caseId }: { caseId: number }) {
  const generation = useSessionGeneration();
  return <InquiryEditor key={`${generation}:${caseId}`} caseId={caseId}/>;
}
function InquiryEditor({ caseId }: { caseId: number }) {
 const {translate} = useTranslation();

  const s = useSessionScope();
  const removal = useCaseRemoval(caseId);
  const [text, setText] = useState("");
  const [origin, setOrigin] = useMessageState(translate("caseSupport.inquiryScreen_inquiryEditor"));
  const [message, setMessage] = useMessageState("");
  const [confirm, setConfirm] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const lock = useRef(false);
  const mutation = useMutation({ gcTime: 0, mutationFn: () => supportApi(s.api).inquiry(caseId) });
  async function generate() {
    if (lock.current) return;
    lock.current = true;
    setConfirm(false);
    try { await mutation.mutateAsync(); } catch { /* direct editor remains available */ }
    finally { lock.current = false; }
  }
  const error = mutation.error;
  return <div className="t7-support max-w-[760px] min-w-0 space-y-5 [overflow-wrap:anywhere]">
    <CaseStageHeader stage="inquiry" title={translate("caseSupport.inquiryScreen_company_inquiry_review")} description={translate("caseSupport.inquiryScreen_company_confirm_content_draft_review")} />

    <p data-case-notice>{translate("caseSupport.inquiryScreen_draft_review_edit_company")}</p>
    <section className={`${cardStyle} space-y-4`} aria-label={translate("caseSupport.inquiryScreen_current")}>    <Textarea id="inquiry-text" label={origin} className="min-h-60" value={text} onChange={e => { setText(e.target.value); setMessage(""); }}/>
    <button className={primaryButton} disabled={!text} onClick={async () => { try { await navigator.clipboard.writeText(text); setMessage(describeMessage("caseSupport.inquiryScreen_onClick_button")); } catch { setMessage(describeMessage("caseSupport.inquiryScreen_failure_select")); } }}>{translate("caseSupport.inquiryScreen_section")}</button>
    </section>
    <button className={secondaryButton} disabled={mutation.isPending || !s.enabled || removal.pending || removal.removed} onClick={() => { if (text || mutation.data) setConfirm(true); else void generate(); }}>{mutation.isPending ? translate("caseSupport.inquiryScreen_draft") : mutation.data ? translate("caseSupport.inquiryScreen_draft_2") : translate("caseSupport.inquiryScreen_draft_3")}</button>
    {confirm && <ConfirmDialog title={translate("caseSupport.inquiryScreen_draft_retry")} onClose={() => setConfirm(false)} action={<button className={secondaryButton} onClick={() => void generate()}>{translate("caseSupport.inquiryScreen_action")}</button>}><p>{translate("caseSupport.inquiryScreen_previous_draft_new_applicable_required_content")}</p></ConfirmDialog>}
    {error && <><QueryFeedback error={error}/><p role="alert">{error instanceof ApiError && error.errorCode === "REPORT_SOURCE_STALE" ? translate("caseSupport.inquiryScreen_result_current_status_update_retry") : error instanceof ApiError && (error.status === 503 || error.errorCode === "UPSTREAM_UNAVAILABLE") ? translate("caseSupport.inquiryScreen_use_count_empty_retry") : translate("caseSupport.inquiryScreen_draft_failure_use_count")}</p></>}
    {mutation.data && <section className={`${cardStyle} space-y-3`} aria-label={translate("caseSupport.inquiryScreen_original")}><details><summary>{translate("caseSupport.inquiryScreen_original_applicable_basis")}</summary><p className="whitespace-pre-wrap">{mutation.data.text}</p><p>{mutation.data.requiresUserReview === true ? translate("caseSupport.inquiryScreen_user_review_count") : mutation.data.requiresUserReview === false ? translate("caseSupport.inquiryScreen_user_review_use") : translate("caseSupport.inquiryScreen_review_notProvided_use_confirm")}</p><p>{translate("caseSupport.inquiryScreen_reference_result_version", { value1: mutation.data.basedOnResultVersions ? Object.entries(mutation.data.basedOnResultVersions).map(([k,v]) => `${k}: ${v ?? translate("caseSupport.centersScreen_confirm")}`).join(" / ") : translate("common.notProvided") })}</p><button className={secondaryButton} onClick={() => { if (text) setMessage(describeMessage("caseSupport.inquiryScreen_confirm_draft_applicable_count")); else { setText(mutation.data!.text); setOrigin(describeMessage("caseSupport.inquiryScreen_draft_user")); } }}>{translate("caseSupport.inquiryScreen_draft_4")}</button>{text && <button className={secondaryButton} onClick={() => setReplaceOpen(true)}>{translate("caseSupport.inquiryScreen_confirm")}</button>}</details></section>}
    {replaceOpen && <ConfirmDialog title={translate("caseSupport.inquiryScreen_draft_5")} onClose={() => setReplaceOpen(false)} action={<button className={secondaryButton} onClick={() => { if (!replaceOpen || !mutation.data) return; setReplaceOpen(false); setText(mutation.data.text); setOrigin(describeMessage("caseSupport.inquiryScreen_draft_user")); setMessage(describeMessage("caseSupport.inquiryScreen_draft_use_content_review")); }}>{translate("caseSupport.inquiryScreen_action2")}</button>}><p>{translate("caseSupport.inquiryScreen_current_all_original_content_cancel")}</p></ConfirmDialog>}
    <nav className="flex flex-wrap gap-3"><Link className={secondaryButton} href={`/cases/${caseId}/questions`}>{translate("caseSupport.inquiryScreen_confirm_question")}</Link><Link className={secondaryButton} href={`/cases/${caseId}/result`}>{translate("caseSupport.inquiryScreen_calculation_result")}</Link><Link className={secondaryButton} href="/consultation-centers">{translate("caseSupport.inquiryScreen_consultationCenter")}</Link><Link className={secondaryButton} href={`/cases/${caseId}/reports`}>{translate("caseSupport.inquiryScreen_report")}</Link></nav>
    <p role="status">{message}</p><p>{translate("caseSupport.inquiryScreen_confirm_unpaid_wage_content_save")}</p>
  </div>;
}
