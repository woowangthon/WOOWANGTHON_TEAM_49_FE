"use client";
import { translate } from "@/i18n/translate";

import { useId, useRef, useState } from "react";
import { FolderOpen, Search } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { WorkplacePicker } from "@/features/workplaces/components/workplace-picker";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useDocuments } from "../queries";
import { uploadDocumentTypes, processingStatuses, type DocumentContext } from "../schemas";
import { statusLabels, storedTypeLabel } from "../view-models";
import { DocumentCard } from "./document-card";
import styles from "./workplace-documents.module.css";
import libraryStyles from "./library.module.css";

export function DocumentList(props: Parameters<typeof FilteredDocumentList>[0]) {
  return props.context.kind === "case" ? <ConnectedDocumentList {...props} /> : <FilteredDocumentList {...props} />;
}

function ConnectedDocumentList({context, inputVersion}: Parameters<typeof FilteredDocumentList>[0]) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const query = useDocuments(context, {page, size:20});
  return <div className="min-w-0 space-y-4">
    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
      {query.data.items.length ? <div className="document-rows min-w-0">{query.data.items.map(dto => <DocumentCard key={dto.documentId} dto={dto} context={context} inputVersion={inputVersion} onEditingChange={setEditing} />)}</div> : <p className={cardStyle}>{translate("documents.documentList_link_record_empty_file_create")}</p>}
      {(query.data.total > query.data.size || query.data.page > 1) && <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching || editing} onPage={setPage} />}
    </>}
  </div>;
}

function FilteredDocumentList({ context, inputVersion, selectableCaseId, canConnect, variant = "default" }: { variant?: "default" | "workplace" | "library"; context: DocumentContext; inputVersion?: number; selectableCaseId?: number; canConnect?: boolean }) {
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
  const serverFiltered = Boolean(documentType || workplaceId);
  const hasFilters = serverFiltered || Boolean(processingStatus) || search.length > 0;
  const initialEmpty = query.isSuccess && query.data.total === 0 && !serverFiltered;
  const visibleItems = query.data?.items.filter(d => d.fileName.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!processingStatus || d.processingStatus === processingStatus)) ?? [];
  const clearFilters = () => { setDocumentType(""); setProcessingStatus(""); setWorkplaceId(null); setWorkplaceName(""); setSearch(""); setPage(1); };
  const chooseWorkplace = (value: number | null, name = "") => {
    setWorkplaceId(value); setWorkplaceName(name); setPage(1);
    if (libraryView && picker.current) { picker.current.open = false; picker.current.querySelector("summary")?.focus(); }
  };

  return <div className={libraryView ? libraryStyles.list : workplaceView ? styles.list : "min-w-0 space-y-5"}>
    {editing && <p role="status">{translate("documents.documentList_link_filter_page_change_count")}</p>}
    <fieldset hidden={(workplaceView || libraryView) && initialEmpty} disabled={editing} className={libraryView ? libraryStyles.filters : workplaceView ? styles.filters : "min-w-0 space-y-4"}>
      {context.kind === "library" && <details ref={picker} className={libraryView ? libraryStyles.workplace : cardStyle}>
        <summary className={libraryView ? undefined : "min-h-11 cursor-pointer text-body font-bold"}>{translate("documents.documentList_workplace_filter", { value1: workplaceId ? workplaceName || translate("documents.documentCard_workplace", { value1: workplaceId }) : translate("documents.documentList_all_workplace") })}</summary>
        <div className="mt-4"><button type="button" className={`mb-4 ${secondaryButton}`} onClick={() => chooseWorkplace(null)}>{translate("documents.documentList_all_workplace")}</button><WorkplacePicker value={workplaceId} onChange={chooseWorkplace} /></div>
      </details>}
      <div className={libraryView ? libraryStyles.controls : workplaceView ? styles.filterControls : "grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
        {workplaceView ? <div className={styles.types} role="group" aria-label={translate("documents.documentList_document_type_filter")}>{[["", translate("documents.documentList_all")], ...uploadDocumentTypes.map(type => [type, storedTypeLabel(type)])].map(([value, label]) => <button key={value} type="button" aria-pressed={documentType === value} onClick={() => { setDocumentType(value); setPage(1); }}>{label}</button>)}</div> : context.kind !== "case" && <SelectField id={`${id}-type`} label={translate("documents.documentList_document_type_filter")} value={documentType} onChange={e => { setDocumentType(e.target.value); setPage(1); }}><option value="">{translate("documents.documentList_all_type")}</option>{uploadDocumentTypes.map(t => <option key={t} value={t}>{storedTypeLabel(t)}</option>)}</SelectField>}
        {context.kind === "library" && <SelectField id={`${id}-status`} label={translate("documents.documentList_processing_status_filter")} value={processingStatus} onChange={e => { setProcessingStatus(e.target.value); setPage(1); }}><option value="">{translate("documents.documentList_all_status")}</option>{processingStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</SelectField>}
        <TextField id={`${id}-search`} label={translate("documents.documentList_current_page_file_search")} placeholder={workplaceView || libraryView ? translate("documents.documentList_file_name") : undefined} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
    </fieldset>
    {!workplaceView && !libraryView && <p className="text-caption text-muted">{translate("documents.documentList_file_search_current_page_document_applicable")}</p>}
    {libraryView && <div className={libraryStyles.results}><h2>{serverFiltered ? translate("documents.documentList_filter_result") : translate("documents.documentList_archived_record")}{query.isSuccess && <span>{translate("documents.documentList_h23", { value1: query.data.total })}</span>}</h2>{hasFilters && <button type="button" disabled={editing} onClick={clearFilters}>{translate("documents.documentList_filter")}</button>}</div>}
    {libraryView && search && query.isSuccess && <p className={libraryStyles.searchStatus} role="status">{translate("documents.documentList_current_page_file_match_record", { value1: visibleItems.length })}</p>}
    {query.isPending ? <QueryFeedback pending /> : query.isError ? <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} /> : <>
      {!query.data.items.length ? <section className={libraryView ? libraryStyles.empty : cardStyle}>
        {libraryView && <FolderOpen size={36} strokeWidth={1.6} aria-hidden="true" />}
        <h3 className="text-title font-bold">{libraryView && serverFiltered ? translate("documents.documentList_record_empty") : translate("documents.documentList_create_record_empty")}</h3>
        <p className="mt-3 text-body text-muted">{libraryView ? initialEmpty ? translate("documents.documentList_workplace_record_create") : translate("documents.documentList_workplace_document_type_processing_status") : workplaceView && initialEmpty ? translate("documents.documentList_record_add_file_create") : translate("documents.documentList_filter_new_file_create")}</p>
      </section> : libraryView && !visibleItems.length ? <section className={libraryStyles.empty}><Search size={30} aria-hidden="true" /><h3>{translate("documents.documentList_current_page_search_result_empty")}</h3><p>{translate("documents.documentList_file_name_page_confirm")}</p></section> : <div className="document-rows min-w-0">{visibleItems.map(dto => <DocumentCard key={dto.documentId} dto={dto} context={context} inputVersion={inputVersion} selectableCaseId={selectableCaseId} canConnect={canConnect} onEditingChange={setEditing} />)}{!visibleItems.length && <p role="status">{translate("documents.documentList_current_page_search_result_empty")}</p>}</div>}
      {((!workplaceView && !libraryView) || query.data.total > query.data.size || query.data.page > 1) && <Pagination page={query.data.page} size={query.data.size} total={query.data.total} busy={query.isFetching || editing} onPage={value => { setPage(value); setSearch(""); }} />}
    </>}
  </div>;
}
