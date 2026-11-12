"use client";
import Link from "next/link";
import { useState } from "react";
import { FileUp, FolderOpen } from "lucide-react";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { WorkplaceHeader } from "@/features/workplaces/components/workplace-header";
import workplaceStyles from "@/features/workplaces/components/workplace-space.module.css";
import documentStyles from "./workplace-documents.module.css";
import libraryStyles from "./library.module.css";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useWorkplace, useWorkplaceRemoval } from "@/features/workplaces/queries";
import { useDocuments } from "../queries";
import { DocumentList } from "./document-list";
import { UploadForm } from "./upload-form";
export function LibraryScreen() {
  return <div className={`${workplaceStyles.screen} ${documentStyles.screen} ${libraryStyles.screen}`}>
    <header className={libraryStyles.header}>
      <div className={libraryStyles.copy}><p className={libraryStyles.eyebrow}>내 급여 기록의 시작</p><h1>전체 자료함</h1><p className={libraryStyles.intro}>여러 근무지의 자료를 한곳에서.<br />필요한 기록을 찾아 이어서 확인해요.</p><Link href="/workplaces" className={libraryStyles.register}><FileUp size={18} aria-hidden="true" />근무지에서 자료 등록</Link></div>
      <div className={libraryStyles.art} aria-hidden="true"><div className={libraryStyles.paperBack} /><div className={libraryStyles.paper}><span /><i /><i /><i /></div><div className={libraryStyles.folder}><FolderOpen size={30} strokeWidth={1.6} /><span>MY FILES</span></div><span className={libraryStyles.sparkle}>+</span></div>
    </header>
    <DocumentList context={{kind: "library"}} variant="library" />
    <details className={documentStyles.notice}><summary>공유 자료 이용 안내</summary><p>같은 원본을 여러 급여 내역에 연결할 수 있어요. 연결 해제는 원본을 유지하고, 원본 삭제는 연결된 다른 내역에도 영향을 줘요.</p><p>처리 완료와 검토 확인은 별개예요. 연결한 내역에서 원문과 추출값을 확인해 주세요.</p></details>
  </div>;
}
export function WorkplaceDocumentsScreen({ id }: { id: number }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const query = useWorkplace(id);
  const removal = useWorkplaceRemoval(id);
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 근무지입니다.</p>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  return <div className={`${workplaceStyles.screen} ${documentStyles.screen}`}>
    <WorkplaceHeader id={id} workplace={query.data} active="documents" />
    <div className={workplaceStyles.sectionHead}><div><h2>근무지 자료함</h2><p>이 근무지의 자료를 모아 급여 내역에 연결해요.</p></div><button type="button" className={workplaceStyles.create} aria-expanded={uploadOpen} aria-controls={`workplace-${id}-upload`} onClick={() => setUploadOpen(value => !value)}><FileUp size={18} aria-hidden="true" />{uploadOpen ? "자료 추가 닫기" : "자료 추가"}</button></div>
    <section id={`workplace-${id}-upload`} hidden={!uploadOpen} className={documentStyles.upload} aria-label="자료 추가"><UploadForm context={{ kind: "workplace", id }} /></section>
    <DocumentList context={{ kind: "workplace", id }} variant="workplace" />
    <details className={documentStyles.notice}><summary>공유 자료 이용 안내</summary><p>같은 원본을 여러 급여 내역에 연결할 수 있어요. 연결 해제는 원본을 유지하고, 원본 삭제는 연결된 다른 내역에도 영향을 줘요.</p><p>처리 완료와 검토 확인은 별개예요. 연결한 내역에서 원문과 추출값을 확인해 주세요.</p></details>
  </div>;
}
export function CaseUploadScreen({ id }: { id: number }) {
  const query = useCase(id);
  const removal = useCaseRemoval(id);
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 급여 내역입니다.</p>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  return <CaseDocuments id={id} workplaceName={(typeof query.data.workplace.name === "string" ? query.data.workplace.name : "\uadfc\ubb34\uc9c0 \uc815\ubcf4 \ubbf8\uc81c\uacf5")} inputVersion={query.data.inputVersion} />;
}
function CaseDocuments({ id, workplaceName, inputVersion }: { id: number; workplaceName: string; inputVersion: number }) {
  const docs = useDocuments({ kind: "case", id }, { page: 1, size: 20 });
  const canAdd = !!docs.data && !docs.isError && docs.data.total < 20;
  return <div className="document-screen min-w-0 space-y-6">
    <CaseStageHeader stage="upload" title={`${workplaceName} 자료 등록`} description="확인할 자료를 업로드하고 원문과 추출된 내용을 검토해 주세요." />
    <nav data-case-next aria-label="자료 관련 화면"><div><h2>자료를 준비했다면</h2><p>원문과 추출된 내용을 확인해 주세요.</p></div><Link href={`/cases/${id}/review`} className={secondaryButton}>원문·추출값 검토</Link></nav>
    {docs.isError && <QueryFeedback error={docs.error} retry={() => { void docs.refetch(); }} />}
    {docs.data && docs.data.total >= 20 && <p role="alert" className={cardStyle}>내역에는 문서를 최대 20개 연결할 수 있습니다. 기존 연결을 해제한 뒤 등록해 주세요.</p>}
    <section data-case-upload aria-label="새 파일 업로드"><UploadForm context={{ kind: "case", id }} disabled={!canAdd} /></section>
    <section className={cardStyle}><h2 className="text-title font-bold">이 내역에 연결된 자료{docs.data ? ` · ${docs.data.total}개` : ""}</h2><section className="mt-4 space-y-4" aria-label="이 내역에 연결된 자료"><DocumentList context={{ kind: "case", id }} inputVersion={inputVersion} /></section></section>
  </div>;
}
