"use client";
import { translate } from "@/i18n/translate";

import Link from "next/link";
import { useState } from "react";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { SelectField } from "@/components/ui/select-field";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { useInputAction, useManual, useManuals } from "../queries";
import { recordTypes, type ManualSaved, type RecordType } from "../schemas";
import { manualFields, typeLabels } from "../manual-fields";
import { ManualForm } from "./manual-form";
import { InputStatus } from "./input-status";

export function ManualScreen({ caseId }: { caseId: number }) {
  const owner = useCase(caseId); const removal = useCaseRemoval(caseId);
  const [visited, setVisited] = useState<RecordType[]>(["CONTRACT"]);
  const [mode, setMode] = useState<"new" | "records">("new");
  const [opened, setOpened] = useState<number[]>([]);
  const [page, setPage] = useState(1); const [type, setType] = useState<RecordType>("CONTRACT");
  const [selected, setSelected] = useState<number>(); const [receipt, setReceipt] = useState<ManualSaved>(); const [formKeys, setFormKeys] = useState<Partial<Record<RecordType, number>>>({});
  const list = useManuals(caseId, page);
  if (removal.pending || removal.removed) return <p role="status">{translate("caseInputs.manualScreen_delete_case")}</p>;
  if (owner.isPending) return <QueryFeedback pending />;
  if (owner.isError) return <QueryFeedback error={owner.error} retry={() => { void owner.refetch(); }} />;
  return <div className="min-w-0 space-y-6"><CaseStageHeader stage="manual" title={translate("caseInputs.manualScreen_manual_record_input")} description={translate("caseInputs.manualScreen_file_empty_work_wage_information_count_minutes")} />

    {receipt && <p role="status" className={`${cardStyle} break-words`}>{"canonicalResource" in receipt ? translate("caseInputs.manualScreen_deposit_transaction_allocation_manual_list_add_edit", { value1: receipt.transactionId, value2: receipt.allocationId }) : translate("caseInputs.manualScreen_manual_save", { value1: receipt.recordId })}</p>}

    <div className="flex flex-wrap gap-3" aria-label={translate("caseInputs.manualScreen_input")}><button type="button" className={mode === "new" ? primaryButton : secondaryButton} aria-pressed={mode === "new"} onClick={() => setMode("new")}>{translate("caseInputs.manualScreen_new_input")}</button><button type="button" className={mode === "records" ? primaryButton : secondaryButton} aria-pressed={mode === "records"} onClick={() => setMode("records")}>{translate("caseInputs.manualScreen_div2")}</button></div>
    <div data-case-manual-input hidden={mode !== "new"}><SelectField id="manual-record-type" label={translate("caseInputs.manualScreen_manual_record_type")} value={type} onChange={e => { setType(e.target.value as RecordType); setVisited(types => types.includes(e.target.value as RecordType) ? types : [...types, e.target.value as RecordType]); setSelected(undefined); }} >{recordTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}</SelectField>
    {visited.map(t => <div key={`${t}-${formKeys[t] ?? 0}`} hidden={type !== t}><ManualForm caseId={caseId} type={t} periodStart={owner.data.periodStart} periodEnd={owner.data.periodEnd} onSaved={r => { setReceipt(r); setFormKeys(keys => ({ ...keys, [t]: (keys[t] ?? 0) + 1 })); setPage(1); setMode("records"); }} /></div>)}
    </div>
    <section hidden={mode !== "records"} className="space-y-4" aria-label={translate("caseInputs.manualScreen_manual_list")}><h2 className="text-title font-bold">{translate("caseInputs.manualScreen_manual")}</h2><p>{translate("caseInputs.manualScreen_source_user_input_deposit_transaction_list_duplicate")}</p>{list.isPending ? <QueryFeedback pending /> : list.isError ? <QueryFeedback error={list.error} retry={() => { void list.refetch(); }} /> : <>
      {!list.data.items.length && <p className={cardStyle}>{translate("caseInputs.manualScreen_page_manual_empty")}</p>}
      <ul className="space-y-3">{list.data.items.map(r => <li key={r.recordId} className={`${cardStyle} flex flex-wrap items-center justify-between gap-3`}><span>{translate("caseInputs.manualScreen_original_none_user_input", { value1: typeLabels[r.recordType], value2: r.recordId })}</span><button className={secondaryButton} onClick={() => { setSelected(r.recordId); setOpened(ids => ids.includes(r.recordId) ? ids : [...ids, r.recordId]); }}>{translate("caseInputs.manualScreen_detail_edit", { value1: r.recordId })}</button></li>)}</ul><Pagination page={list.data.page} size={list.data.size} total={list.data.total} onPage={setPage} busy={list.isFetching} /></>}
    </section>{opened.map(recordId => <div key={recordId} hidden={mode !== "records" || selected !== recordId}><ManualDetail caseId={caseId} recordId={recordId} periodStart={owner.data.periodStart} periodEnd={owner.data.periodEnd} onClose={() => setSelected(undefined)} onDeleted={() => { setSelected(undefined); setOpened(ids => ids.filter(id => id !== recordId)); }} onSaved={setReceipt} /></div>)}
    <nav data-case-next aria-label={translate("caseInputs.manualScreen_case_record")}><div><h2>{translate("caseInputs.manualScreen_save")}</h2><p>{translate("caseInputs.manualScreen_calculation_required_confirm")}</p></div><Link className={secondaryButton} href={`/cases/${caseId}/conditions`}>{translate("caseInputs.manualScreen_calculation_confirm")}</Link></nav><details className={cardStyle}><summary>{translate("caseInputs.manualScreen_run_automatic_update_status")}</summary><InputStatus caseId={caseId} /><Link className={secondaryButton} href={`/cases/${caseId}/upload`}>{translate("caseInputs.manualScreen_document_record_create")}</Link></details>
  </div>;
}
function ManualDetail({ caseId, recordId, periodStart, periodEnd, onClose, onDeleted, onSaved }: { caseId: number; recordId: number; periodStart: string; periodEnd: string; onClose: () => void; onDeleted: () => void; onSaved: (r: ManualSaved) => void }) {
  const record = useManual(caseId, recordId); const mutation = useInputAction(caseId);
  const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false); const [error, setError] = useState("");
  if (record.isPending) return <QueryFeedback pending />;
  if (record.isError) return <QueryFeedback error={record.error} retry={() => { void record.refetch(); }} />;
  if (record.data.recordType === "DEPOSIT") return <p>{translate("caseInputs.manualScreen_deposit_transaction_allocation_manual_provided")}</p>;
  return <section aria-label={translate("caseInputs.manualScreen_manual_detail")} className="min-w-0 space-y-4"><h2 className="text-title font-bold">{translate("caseInputs.manualScreen_manual_2", { value1: recordId, value2: typeLabels[record.data.recordType] })}</h2><p>{translate("caseInputs.manualScreen_original_document_none_user_input")}</p>{Object.keys(record.data.data).length === 0 && <p>{translate("caseInputs.manualScreen_input_empty")}</p>}<dl className={`${cardStyle} space-y-2 break-words`}>{Object.entries(record.data.data).filter(([key]) => manualFields[record.data.recordType].some(f => f.key === key)).map(([key, value]) => <div key={key}><dt className="font-bold">{manualFields[record.data.recordType].find(f => f.key === key)?.label}</dt><dd>{value === null ? translate("caseInputs.manualForm_confirm_2") : Array.isArray(value) ? value.length ? value.join(", ") : translate("caseInputs.manualScreen_input_item_none") : typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>
    <details className="border-t border-border pt-3"><summary className="min-h-11 cursor-pointer font-bold">{translate("caseInputs.manualScreen_original_detail")}</summary><p>{translate("caseInputs.manualScreen_source", { value1: recordId, value2: record.data.source })}</p><pre className="whitespace-pre-wrap break-all">{JSON.stringify(record.data.data, null, 2)}</pre></details>
    <div hidden={!editing}><ManualForm caseId={caseId} type={record.data.recordType} initial={record.data} periodStart={periodStart} periodEnd={periodEnd} onSaved={r => { setEditing(false); onSaved(r); }} /></div>
    {error && <p role="alert">{error}</p>}<div className="flex flex-wrap gap-3"><button className={secondaryButton} onClick={() => setEditing(!editing)}>{editing ? translate("caseInputs.manualScreen_edit_close") : translate("caseInputs.manualScreen_edit")}</button><button className={secondaryButton} onClick={() => setDeleting(true)}>{translate("caseInputs.manualScreen_delete")}</button><button className={secondaryButton} onClick={onClose}>{translate("caseInputs.manualScreen_detail_close")}</button></div>
    {deleting && <ConfirmDialog title={translate("caseInputs.manualScreen_manual_delete")} busy={mutation.isPending} onClose={() => setDeleting(false)} action={<button className={primaryButton} disabled={mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ type: "remove", recordId }); onDeleted(); } catch (e) { setError(businessErrorMessage(e)); setDeleting(false); } }}>{translate("caseInputs.manualScreen_manual_delete_confirm")}</button>}><p>{translate("caseInputs.manualScreen_user_input_delete_check_retry_update")}</p></ConfirmDialog>}
  </section>;
}
