"use client";
import { useId, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { WorkplacePicker } from "@/features/workplaces/components/workplace-picker";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useDocuments } from "../queries";
import { documentTypes, processingStatuses, type DocumentContext } from "../schemas";
import { statusLabels, typeLabels } from "../view-models";
import { DocumentCard } from "./document-card";
export function DocumentList({ context, inputVersion, selectableCaseId, canConnect }: { context: DocumentContext; inputVersion?: number; selectableCaseId?: number; canConnect?: boolean }) {
  const id = useId();
  const [page, setPage] = useState(1);
  const [documentType, setDocumentType] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [workplaceId, setWorkplaceId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const query = useDocuments(context, { page, size: 20, workplaceId: workplaceId ?? undefined, documentType, processingStatus });
  return <div className="min-w-0 space-y-5">
    {context.kind === "library" && <details className={cardStyle}><summary className="min-h-11 cursor-pointer text-body font-bold">근무지 필터 {workplaceId ? `(선택: #${workplaceId})` : "(전체 근무지)"}</summary><div className="mt-4"><button type="button" className={`mb-4 ${secondaryButton}`} onClick={() => { setWorkplaceId(null); setPage(1); }}>전체 근무지</button><WorkplacePicker value={workplaceId} onChange={value => { setWorkplaceId(value); setPage(1); }} /></div></details>}
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {context.kind !== "case" && <SelectField id={`${id}-type`} label="문서 유형 필터" value={documentType} onChange={e => { setDocumentType(e.target.value); setPage(1); }}><option value="">전체 유형</option>{documentTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}</SelectField>}
      {context.kind === "library" && <SelectField id={`${id}-status`} label="처리 상태 필터" value={processingStatus} onChange={e => { setProcessingStatus(e.target.value); setPage(1); }}><option value="">전체 상태</option>{processingStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</SelectField>}
      <TextField id={`${id}-search`} label="현재 페이지 파일명 검색" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
    <p className="text-caption text-muted">파일명 검색은 현재 서버 페이지의 문서에만 적용됩니다. 서버 전체 검색은 명세에 제공되지 않습니다.</p>
    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
      {!query.data.items.length ? <section className={cardStyle}><h3 className="text-title font-bold">등록된 자료가 없습니다</h3><p className="mt-3 text-body text-muted">필터를 바꾸거나 근무지·사례에서 새 파일을 등록해 주세요.</p></section> : <div className="document-rows min-w-0">{query.data.items.filter(d => d.fileName.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(dto => <DocumentCard key={dto.documentId} dto={dto} context={context} inputVersion={inputVersion} selectableCaseId={selectableCaseId} canConnect={canConnect} />)}{query.data.items.every(d => !d.fileName.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <p role="status">현재 페이지에 검색 결과가 없습니다.</p>}</div>}
      <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching} onPage={value => { setPage(value); setSearch(""); }} />
    </>}
  </div>;
}
