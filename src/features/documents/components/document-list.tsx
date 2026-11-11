"use client";
import { useId, useRef, useState } from "react";
import { FolderOpen, Search } from "lucide-react";
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
import styles from "./workplace-documents.module.css";
import libraryStyles from "./library.module.css";

export function DocumentList({ context, inputVersion, selectableCaseId, canConnect, variant = "default" }: { variant?: "default" | "workplace" | "library"; context: DocumentContext; inputVersion?: number; selectableCaseId?: number; canConnect?: boolean }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [documentType, setDocumentType] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [workplaceId, setWorkplaceId] = useState<number | null>(null);
  const [workplaceName, setWorkplaceName] = useState("");
  const [search, setSearch] = useState("");
  const picker = useRef<HTMLDetailsElement>(null);
  const query = useDocuments(context, { page, size: 20, workplaceId: workplaceId ?? undefined, documentType, processingStatus });
  const workplaceView = variant === "workplace";
  const libraryView = variant === "library";
  const serverFiltered = Boolean(documentType || processingStatus || workplaceId);
  const hasFilters = serverFiltered || search.length > 0;
  const initialEmpty = query.isSuccess && query.data.total === 0 && !serverFiltered;
  const visibleItems = query.data?.items.filter(d => d.fileName.toLocaleLowerCase().includes(search.toLocaleLowerCase())) ?? [];
  const clearFilters = () => { setDocumentType(""); setProcessingStatus(""); setWorkplaceId(null); setWorkplaceName(""); setSearch(""); setPage(1); };
  const chooseWorkplace = (value: number | null, name = "") => {
    setWorkplaceId(value); setWorkplaceName(name); setPage(1);
    if (libraryView && picker.current) { picker.current.open = false; picker.current.querySelector("summary")?.focus(); }
  };

  return <div className={libraryView ? libraryStyles.list : workplaceView ? styles.list : "min-w-0 space-y-5"}>
    {editing && <p role="status">연결 편집을 마친 뒤 필터와 페이지를 변경할 수 있습니다.</p>}
    <fieldset hidden={(workplaceView || libraryView) && initialEmpty} disabled={editing} className={libraryView ? libraryStyles.filters : workplaceView ? styles.filters : "min-w-0 space-y-4"}>
      {context.kind === "library" && <details ref={picker} className={libraryView ? libraryStyles.workplace : cardStyle}>
        <summary className={libraryView ? undefined : "min-h-11 cursor-pointer text-body font-bold"}>근무지 필터 · {workplaceId ? workplaceName || `근무지 #${workplaceId}` : "전체 근무지"}</summary>
        <div className="mt-4"><button type="button" className={`mb-4 ${secondaryButton}`} onClick={() => chooseWorkplace(null)}>전체 근무지</button><WorkplacePicker value={workplaceId} onChange={chooseWorkplace} /></div>
      </details>}
      <div className={libraryView ? libraryStyles.controls : workplaceView ? styles.filterControls : "grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
        {workplaceView ? <div className={styles.types} role="group" aria-label="문서 유형 필터">{[["", "전체"], ...documentTypes.map(type => [type, typeLabels[type]])].map(([value, label]) => <button key={value} type="button" aria-pressed={documentType === value} onClick={() => { setDocumentType(value); setPage(1); }}>{label}</button>)}</div> : context.kind !== "case" && <SelectField id={`${id}-type`} label="문서 유형 필터" value={documentType} onChange={e => { setDocumentType(e.target.value); setPage(1); }}><option value="">전체 유형</option>{documentTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}</SelectField>}
        {context.kind === "library" && <SelectField id={`${id}-status`} label="처리 상태 필터" value={processingStatus} onChange={e => { setProcessingStatus(e.target.value); setPage(1); }}><option value="">전체 상태</option>{processingStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</SelectField>}
        <TextField id={`${id}-search`} label="현재 페이지 파일명 검색" placeholder={workplaceView || libraryView ? "파일 이름으로 찾아보세요" : undefined} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
    </fieldset>
    {!workplaceView && !libraryView && <p className="text-caption text-muted">파일명 검색은 현재 페이지의 문서에만 적용됩니다.</p>}
    {libraryView && <div className={libraryStyles.results}><h2>{serverFiltered ? "필터 결과" : "보관된 자료"}{query.isSuccess && <span>{query.data.total}개</span>}</h2>{hasFilters && <button type="button" disabled={editing} onClick={clearFilters}>필터 초기화</button>}</div>}
    {libraryView && search && query.isSuccess && <p className={libraryStyles.searchStatus} role="status">현재 페이지에서 파일명과 일치하는 자료 {visibleItems.length}개</p>}
    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
      {!query.data.items.length ? <section className={libraryView ? libraryStyles.empty : cardStyle}>
        {libraryView && <FolderOpen size={36} strokeWidth={1.6} aria-hidden="true" />}
        <h3 className="text-title font-bold">{libraryView && serverFiltered ? "조건에 맞는 자료가 없어요" : "등록된 자료가 없습니다"}</h3>
        <p className="mt-3 text-body text-muted">{libraryView ? initialEmpty ? "위의 근무지에서 자료 등록 버튼으로 첫 자료를 모아 보세요." : "근무지, 문서 유형 또는 처리 상태를 바꿔 보세요." : workplaceView && initialEmpty ? "위의 자료 추가 버튼으로 첫 파일을 등록해 보세요." : "필터를 바꾸거나 새 파일을 등록해 주세요."}</p>
      </section> : libraryView && !visibleItems.length ? <section className={libraryStyles.empty}><Search size={30} aria-hidden="true" /><h3>현재 페이지에 검색 결과가 없습니다.</h3><p>파일 이름을 바꾸거나 다른 페이지를 확인해 주세요.</p></section> : <div className="document-rows min-w-0">{visibleItems.map(dto => <DocumentCard key={dto.documentId} dto={dto} context={context} inputVersion={inputVersion} selectableCaseId={selectableCaseId} canConnect={canConnect} onEditingChange={setEditing} />)}{!visibleItems.length && <p role="status">현재 페이지에 검색 결과가 없습니다.</p>}</div>}
      {((!workplaceView && !libraryView) || query.data.total > query.data.size || query.data.page > 1) && <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching || editing} onPage={value => { setPage(value); setSearch(""); }} />}
    </>}
  </div>;
}
