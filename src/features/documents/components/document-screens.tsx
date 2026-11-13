"use client";
import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { useState } from "react";
import { FileUp, FolderOpen } from "lucide-react";
import { CaseNextStep } from "@/features/cases/components/case-next-step";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { WorkplaceHeader } from "@/features/workplaces/components/workplace-header";
import workplaceStyles from "@/features/workplaces/components/workplace-space.module.css";
import documentStyles from "./workplace-documents.module.css";
import libraryStyles from "./library.module.css";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useWorkplace, useWorkplaceRemoval } from "@/features/workplaces/queries";
import { useDocuments } from "../queries";
import { DocumentList } from "./document-list";
import { UploadForm } from "./upload-form";
export function LibraryScreen() {
 const {translate} = useTranslation();

  return <div className={`${workplaceStyles.screen} ${documentStyles.screen} ${libraryStyles.screen}`}>
    <header className={libraryStyles.header}>
      <div className={libraryStyles.copy}><p className={libraryStyles.eyebrow}>{translate("documents.documentScreens_wage_start")}</p><h1>{translate("documents.documentScreens_library")}</h1><p className={libraryStyles.intro}>{translate("documents.documentScreens_workplace_record")}<br />{translate("documents.documentScreens_required_continue_confirm")}</p><Link href="/workplaces" className={libraryStyles.register}><FileUp size={18} aria-hidden="true" />{translate("documents.documentScreens_workplace_record_create")}</Link></div>
      <div className={libraryStyles.art} aria-hidden="true"><div className={libraryStyles.paperBack} /><div className={libraryStyles.paper}><span /><i /><i /><i /></div><div className={libraryStyles.folder}><FolderOpen size={30} strokeWidth={1.6} /><span>MY FILES</span></div><span className={libraryStyles.sparkle}>+</span></div>
    </header>
    <DocumentList context={{kind: "library"}} variant="library" />
    <details className={documentStyles.notice}><summary>{translate("documents.documentScreens_record_notice")}</summary><p>{translate("documents.documentScreens_original_wageCase_link_count_release_delete_case")}</p><p>{translate("documents.documentScreens_processing_complete_review_confirm_link_case_original")}</p></details>
  </div>;
}
export function WorkplaceDocumentsScreen({ id }: { id: number }) {
 const {translate} = useTranslation();

  const [uploadOpen, setUploadOpen] = useState(false);
  const query = useWorkplace(id);
  const removal = useWorkplaceRemoval(id);
  if (removal.pending || removal.removed) return <p role="status">{translate("documents.documentScreens_delete_workplace")}</p>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  return <div className={`${workplaceStyles.screen} ${documentStyles.screen}`}>
    <WorkplaceHeader id={id} workplace={query.data} active="documents" />
    <div className={workplaceStyles.sectionHead}><div><h2>{translate("documents.documentScreens_workplace_library")}</h2><p>{translate("documents.documentScreens_workplace_record_wageCase_link")}</p></div><button type="button" className={workplaceStyles.create} aria-expanded={uploadOpen} aria-controls={`workplace-${id}-upload`} onClick={() => setUploadOpen(value => !value)}><FileUp size={18} aria-hidden="true" />{uploadOpen ? translate("documents.documentScreens_record_add_close") : translate("documents.documentScreens_record_add")}</button></div>
    <section id={`workplace-${id}-upload`} hidden={!uploadOpen} className={documentStyles.upload} aria-label={translate("documents.documentScreens_record_add")}><UploadForm context={{ kind: "workplace", id }} /></section>
    <DocumentList context={{ kind: "workplace", id }} variant="workplace" />
    <details className={documentStyles.notice}><summary>{translate("documents.documentScreens_record_notice")}</summary><p>{translate("documents.documentScreens_original_wageCase_link_count_release_delete_case")}</p><p>{translate("documents.documentScreens_processing_complete_review_confirm_link_case_original")}</p></details>
  </div>;
}
export function CaseUploadScreen({ id }: { id: number }) {
 const {translate} = useTranslation();

  const query = useCase(id);
  const removal = useCaseRemoval(id);
  if (removal.pending || removal.removed) return <p role="status">{translate("documents.documentScreens_delete_wageCase")}</p>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  return <CaseDocuments id={id} workplaceName={(typeof query.data.workplace.name === "string" ? query.data.workplace.name : translate("documents.documentScreens_workplace_information_notProvided"))} inputVersion={query.data.inputVersion} />;
}
function CaseDocuments({ id, workplaceName, inputVersion }: { id: number; workplaceName: string; inputVersion: number }) {
 const {translate} = useTranslation();

  const docs = useDocuments({ kind: "case", id }, { page: 1, size: 20 });
  const canAdd = !!docs.data && !docs.isError && docs.data.total < 20;
  return <div className="document-screen min-w-0 space-y-6">
    <CaseStageHeader stage="upload" title={translate("documents.documentScreens_record_create", { value1: workplaceName })} description={translate("documents.documentScreens_confirm_record_upload_original_extraction_content_review")} />
    <CaseNextStep title={translate("documents.documentScreens_record")} description={translate("documents.documentScreens_original_extraction_content_confirm")} href={`/cases/${id}/review`} label={translate("documents.documentCard_original_extractedValue_review")} ariaLabel={translate("documents.documentScreens_record_2")} />
    {docs.isError && <QueryFeedback error={docs.error} retry={() => { void docs.refetch(); }} />}
    {docs.data && docs.data.total >= 20 && <p role="alert" className={cardStyle}>{translate("documents.documentScreens_case_document_maximum_link_count_release_create")}</p>}
    <section data-case-upload aria-label={translate("documents.documentScreens_new_file_upload")}><UploadForm context={{ kind: "case", id }} disabled={!canAdd} /></section>
    <section className={cardStyle}><h2 className="text-title font-bold">{translate("documents.documentScreens_case_link_record", { value1: docs.data ? translate("documents.documentScreens_value1_h2", { value1: docs.data.total }) : "" })}</h2><section className="mt-4 space-y-4" aria-label={translate("documents.documentScreens_case_link_record_2")}><DocumentList context={{ kind: "case", id }} inputVersion={inputVersion} /></section></section>
  </div>;
}
