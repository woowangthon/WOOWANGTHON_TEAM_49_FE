"use client";
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
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 내역입니다.</p>;
  if (owner.isPending) return <QueryFeedback pending />;
  if (owner.isError) return <QueryFeedback error={owner.error} retry={() => { void owner.refetch(); }} />;
  return <div className="min-w-0 space-y-6"><CaseStageHeader stage="manual" title="수기 자료 입력·관리" description="파일이 없어도 알고 있는 근무·급여 정보를 기록할 수 있어요. 빈칸과 실제 0은 구분해서 입력해 주세요." />

    {receipt && <p role="status" className={`${cardStyle} break-words`}>{"canonicalResource" in receipt ? `입금 거래 #${receipt.transactionId} · 배분 #${receipt.allocationId}을 생성했습니다. PAYMENT_TRANSACTION으로 관리하며 수기 목록에 추가하지 않습니다. 거래 수정·삭제는 후속 단계에서 제공합니다.` : `수기 기록 #${receipt.recordId}을 저장했습니다.`}</p>}

    <div className="flex flex-wrap gap-3" aria-label="입력 작업"><button type="button" className={mode === "new" ? primaryButton : secondaryButton} aria-pressed={mode === "new"} onClick={() => setMode("new")}>새 입력</button><button type="button" className={mode === "records" ? primaryButton : secondaryButton} aria-pressed={mode === "records"} onClick={() => setMode("records")}>기존 기록</button></div>
    <div data-case-manual-input hidden={mode !== "new"}><SelectField id="manual-record-type" label="수기 자료 유형" value={type} onChange={e => { setType(e.target.value as RecordType); setVisited(types => types.includes(e.target.value as RecordType) ? types : [...types, e.target.value as RecordType]); setSelected(undefined); }} >{recordTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}</SelectField>
    {visited.map(t => <div key={`${t}-${formKeys[t] ?? 0}`} hidden={type !== t}><ManualForm caseId={caseId} type={t} periodStart={owner.data.periodStart} periodEnd={owner.data.periodEnd} onSaved={r => { setReceipt(r); setFormKeys(keys => ({ ...keys, [t]: (keys[t] ?? 0) + 1 })); setPage(1); setMode("records"); }} /></div>)}
    </div>
    <section hidden={mode !== "records"} className="space-y-4" aria-label="수기 기록 목록"><h2 className="text-title font-bold">기존 수기 기록</h2><p>출처: 사용자 직접 입력 · 입금 거래는 이 목록에 중복 표시하지 않습니다.</p>{list.isPending ? <QueryFeedback pending /> : list.isError ? <QueryFeedback error={list.error} retry={() => { void list.refetch(); }} /> : <>
      {!list.data.items.length && <p className={cardStyle}>이 페이지에 수기 기록이 없습니다.</p>}
      <ul className="space-y-3">{list.data.items.map(r => <li key={r.recordId} className={`${cardStyle} flex flex-wrap items-center justify-between gap-3`}><span>{typeLabels[r.recordType]} #{r.recordId} · 원본 없음 · 사용자 직접 입력</span><button className={secondaryButton} onClick={() => { setSelected(r.recordId); setOpened(ids => ids.includes(r.recordId) ? ids : [...ids, r.recordId]); }}>기록 #{r.recordId} 상세·수정</button></li>)}</ul><Pagination page={list.data.page} size={list.data.size} total={list.data.total} onPage={setPage} busy={list.isFetching} /></>}
    </section>{opened.map(recordId => <div key={recordId} hidden={mode !== "records" || selected !== recordId}><ManualDetail caseId={caseId} recordId={recordId} periodStart={owner.data.periodStart} periodEnd={owner.data.periodEnd} onClose={() => setSelected(undefined)} onDeleted={() => { setSelected(undefined); setOpened(ids => ids.filter(id => id !== recordId)); }} onSaved={setReceipt} /></div>)}
    <nav data-case-next aria-label="내역 자료 탐색"><div><h2>기록을 저장했다면</h2><p>계산에 필요한 조건을 확인해요.</p></div><Link className={secondaryButton} href={`/cases/${caseId}/conditions`}>계산 조건 확인</Link></nav><details className={cardStyle}><summary>실행 가능성·자동 갱신 상태</summary><InputStatus caseId={caseId} /><Link className={secondaryButton} href={`/cases/${caseId}/upload`}>문서 자료 등록</Link></details>
  </div>;
}
function ManualDetail({ caseId, recordId, periodStart, periodEnd, onClose, onDeleted, onSaved }: { caseId: number; recordId: number; periodStart: string; periodEnd: string; onClose: () => void; onDeleted: () => void; onSaved: (r: ManualSaved) => void }) {
  const record = useManual(caseId, recordId); const mutation = useInputAction(caseId);
  const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false); const [error, setError] = useState("");
  if (record.isPending) return <QueryFeedback pending />;
  if (record.isError) return <QueryFeedback error={record.error} retry={() => { void record.refetch(); }} />;
  if (record.data.recordType === "DEPOSIT") return <p>입금은 거래·배분으로 관리합니다. 일반 수기 편집을 제공하지 않습니다.</p>;
  return <section aria-label="수기 기록 상세" className="min-w-0 space-y-4"><h2 className="text-title font-bold">수기 기록 #{recordId} · {typeLabels[record.data.recordType]}</h2><p>원본 문서 없음 · 사용자 직접 입력</p>{Object.keys(record.data.data).length === 0 && <p>이 기록에는 입력된 값이 없습니다.</p>}<dl className={`${cardStyle} space-y-2 break-words`}>{Object.entries(record.data.data).filter(([key]) => manualFields[record.data.recordType].some(f => f.key === key)).map(([key, value]) => <div key={key}><dt className="font-bold">{manualFields[record.data.recordType].find(f => f.key === key)?.label}</dt><dd>{value === null ? "미확인" : Array.isArray(value) ? value.length ? value.join(", ") : "입력된 항목 없음" : typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>
    <details className="border-t border-border pt-3"><summary className="min-h-11 cursor-pointer font-bold">기록 식별자·원본 데이터 상세</summary><p>기록 번호 {recordId} · 출처 {record.data.source}</p><pre className="whitespace-pre-wrap break-all">{JSON.stringify(record.data.data, null, 2)}</pre></details>
    <div hidden={!editing}><ManualForm caseId={caseId} type={record.data.recordType} initial={record.data} periodStart={periodStart} periodEnd={periodEnd} onSaved={r => { setEditing(false); onSaved(r); }} /></div>
    {error && <p role="alert">{error}</p>}<div className="flex flex-wrap gap-3"><button className={secondaryButton} onClick={() => setEditing(!editing)}>{editing ? "수정 닫기" : "기록 수정"}</button><button className={secondaryButton} onClick={() => setDeleting(true)}>기록 삭제</button><button className={secondaryButton} onClick={onClose}>상세 닫기</button></div>
    {deleting && <ConfirmDialog title="수기 기록 삭제" busy={mutation.isPending} onClose={() => setDeleting(false)} action={<button className={primaryButton} disabled={mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ type: "remove", recordId }); onDeleted(); } catch (e) { setError(businessErrorMessage(e)); setDeleting(false); } }}>수기 기록 삭제 확인</button>}><p>이 사용자 입력 기록을 삭제합니다. 관련 검사가 서버에서 다시 갱신됩니다.</p></ConfirmDialog>}
  </section>;
}
