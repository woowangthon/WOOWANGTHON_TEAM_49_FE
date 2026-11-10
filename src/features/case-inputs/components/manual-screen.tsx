"use client";
import Link from "next/link";
import { useState } from "react";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { PageHeading } from "@/components/ui/page-heading";
import { SelectField } from "@/components/ui/select-field";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { useInputAction, useManual, useManuals } from "../queries";
import { recordTypes, type ManualSaved, type RecordType } from "../schemas";
import { typeLabels } from "../manual-fields";
import { ManualForm } from "./manual-form";
import { InputStatus } from "./input-status";

export function ManualScreen({ caseId }: { caseId: number }) {
  const owner = useCase(caseId); const removal = useCaseRemoval(caseId);
  const [page, setPage] = useState(1); const [type, setType] = useState<RecordType>("CONTRACT");
  const [selected, setSelected] = useState<number>(); const [receipt, setReceipt] = useState<ManualSaved>(); const [formKey, setFormKey] = useState(0);
  const list = useManuals(caseId, page);
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 사례입니다.</p>;
  if (owner.isPending) return <QueryFeedback pending />;
  if (owner.isError) return <QueryFeedback error={owner.error} retry={() => { void owner.refetch(); }} />;
  return <div className="min-w-0 space-y-6"><PageHeading title="수기 자료 입력·관리" description={`${owner.data.workplace.name} · ${owner.data.periodStart} ~ ${owner.data.periodEnd}`} />
    <nav className="flex flex-wrap gap-3" aria-label="사례 자료 탐색"><Link className={secondaryButton} href={`/cases/${caseId}/upload`}>문서 자료 등록</Link><Link className={primaryButton} href={`/cases/${caseId}/conditions`}>계산 조건 확인</Link><Link className={secondaryButton} href={`/cases/${caseId}`}>사례 상세</Link></nav>
    {receipt && <p role="status" className={`${cardStyle} break-words`}>{"canonicalResource" in receipt ? `입금 거래 #${receipt.transactionId} · 배분 #${receipt.allocationId}을 생성했습니다. PAYMENT_TRANSACTION으로 관리하며 수기 목록에 추가하지 않습니다. 거래 수정·삭제는 후속 단계에서 제공합니다.` : `수기 기록 #${receipt.recordId}을 저장했습니다.`}</p>}
    <SelectField id="manual-record-type" label="수기 자료 유형" value={type} onChange={e => { setType(e.target.value as RecordType); setSelected(undefined); }} >{recordTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}</SelectField>
    <ManualForm key={`${type}-${formKey}`} caseId={caseId} type={type} periodStart={owner.data.periodStart} periodEnd={owner.data.periodEnd} onSaved={r => { setReceipt(r); setFormKey(k => k + 1); setPage(1); }} />
    <section className="space-y-4" aria-label="수기 기록 목록"><h2 className="text-title font-bold">기존 수기 기록</h2><p>출처: USER_INPUT · 입금 거래는 이 목록에 중복 표시하지 않습니다.</p>{list.isPending ? <QueryFeedback pending /> : list.isError ? <QueryFeedback error={list.error} retry={() => { void list.refetch(); }} /> : <>
      {!list.data.items.length && <p className={cardStyle}>이 페이지에 수기 기록이 없습니다.</p>}
      <ul className="space-y-3">{list.data.items.map(r => <li key={r.recordId} className={`${cardStyle} flex flex-wrap items-center justify-between gap-3`}><span>{typeLabels[r.recordType]} #{r.recordId} · 원본 없음 · {r.source}</span><button className={secondaryButton} onClick={() => setSelected(r.recordId)}>기록 #{r.recordId} 상세·수정</button></li>)}</ul><Pagination page={list.data.page} size={list.data.size} total={list.data.total} onPage={setPage} busy={list.isFetching} /></>}
    </section>{selected !== undefined && <ManualDetail key={selected} caseId={caseId} recordId={selected} periodStart={owner.data.periodStart} periodEnd={owner.data.periodEnd} onClose={() => setSelected(undefined)} onSaved={setReceipt} />}
    <InputStatus caseId={caseId} />
  </div>;
}
function ManualDetail({ caseId, recordId, periodStart, periodEnd, onClose, onSaved }: { caseId: number; recordId: number; periodStart: string; periodEnd: string; onClose: () => void; onSaved: (r: ManualSaved) => void }) {
  const record = useManual(caseId, recordId); const mutation = useInputAction(caseId);
  const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false); const [error, setError] = useState("");
  if (record.isPending) return <QueryFeedback pending />;
  if (record.isError) return <QueryFeedback error={record.error} retry={() => { void record.refetch(); }} />;
  if (record.data.recordType === "DEPOSIT") return <p>입금은 거래·배분으로 관리합니다. 일반 수기 편집을 제공하지 않습니다.</p>;
  return <section aria-label="수기 기록 상세" className="min-w-0 space-y-4"><h2 className="text-title font-bold">수기 기록 #{recordId} · {typeLabels[record.data.recordType]}</h2><p>원본 문서 없음 · USER_INPUT</p><dl className={`${cardStyle} space-y-2 break-words`}>{Object.entries(record.data.data).map(([key, value]) => <div key={key}><dt className="font-bold">{key}</dt><dd>{value === null ? "미확인 (null)" : Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>
    {editing && <ManualForm caseId={caseId} type={record.data.recordType} initial={record.data} periodStart={periodStart} periodEnd={periodEnd} onSaved={r => { setEditing(false); onSaved(r); }} />}
    {error && <p role="alert">{error}</p>}<div className="flex flex-wrap gap-3"><button className={secondaryButton} onClick={() => setEditing(!editing)}>{editing ? "수정 닫기" : "기록 수정"}</button><button className={secondaryButton} onClick={() => setDeleting(true)}>기록 삭제</button><button className={secondaryButton} onClick={onClose}>상세 닫기</button></div>
    {deleting && <ConfirmDialog title="수기 기록 삭제" busy={mutation.isPending} onClose={() => setDeleting(false)} action={<button className={primaryButton} disabled={mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ type: "remove", recordId }); onClose(); } catch (e) { setError(businessErrorMessage(e)); setDeleting(false); } }}>수기 기록 삭제 확인</button>}><p>이 사용자 입력 기록을 삭제합니다. 관련 검사가 서버에서 다시 갱신됩니다.</p></ConfirmDialog>}
  </section>;
}
