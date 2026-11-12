"use client";
import Link from "next/link";
import { useState } from "react";
import { FileUp, FolderOpen, FilePenLine } from "lucide-react";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { WorkplaceHeader } from "@/features/workplaces/components/workplace-header";
import workplaceStyles from "@/features/workplaces/components/workplace-space.module.css";
import documentStyles from "./workplace-documents.module.css";
import libraryStyles from "./library.module.css";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useWorkplace, useWorkplaceRemoval } from "@/features/workplaces/queries";
import { recomputeActive } from "../api";
import { useDocuments, useRecomputeStatus } from "../queries";
import { DocumentList } from "./document-list";
import { UploadForm } from "./upload-form";
export function LibraryScreen() {
  return <div className={`${workplaceStyles.screen} ${documentStyles.screen} ${libraryStyles.screen}`}>
    <header className={libraryStyles.header}>
      <div className={libraryStyles.copy}><p className={libraryStyles.eyebrow}>내 급여 기록의 시작</p><h1>전체 자료함</h1><p className={libraryStyles.intro}>여러 근무지의 자료를 한곳에서.<br />필요한 기록을 찾아 이어서 확인해요.</p><Link href="/workplaces" className={libraryStyles.register}><FileUp size={18} aria-hidden="true" />근무지에서 자료 등록</Link></div>
      <div className={libraryStyles.art} aria-hidden="true"><div className={libraryStyles.paperBack} /><div className={libraryStyles.paper}><span /><i /><i /><i /></div><div className={libraryStyles.folder}><FolderOpen size={30} strokeWidth={1.6} /><span>MY FILES</span></div><span className={libraryStyles.sparkle}>+</span></div>
    </header>
    <DocumentList context={{kind: "library"}} variant="library" />
    <details className={documentStyles.notice}><summary>공유 자료 이용 안내</summary><p>같은 원본을 여러 급여 사례에 연결할 수 있어요. 연결 해제는 원본을 유지하고, 원본 삭제는 연결된 다른 사례에도 영향을 줘요.</p><p>처리 완료와 검토 확인은 별개예요. 연결한 사례에서 원문과 추출값을 확인해 주세요.</p></details>
  </div>;
}
function DocumentNotice() {
  return <div className="text-caption text-muted"><p>근무지 원본은 여러 사례에서 공유되며, 처리 완료와 검토 확인은 별개입니다.</p><details><summary className="min-h-11 cursor-pointer inline-flex items-center underline">공유와 삭제 안내</summary><p>연결 해제는 원본을 유지하며 원본 삭제는 다른 사례에도 영향을 줍니다. 연결한 사례의 검토 화면에서 원문과 추출값을 확인해 주세요.</p></details></div>;
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
    <div className={workplaceStyles.sectionHead}><div><h2>근무지 자료함</h2><p>이 근무지의 자료를 모아 급여 사례에 연결해요.</p></div><button type="button" className={workplaceStyles.create} aria-expanded={uploadOpen} aria-controls={`workplace-${id}-upload`} onClick={() => setUploadOpen(value => !value)}><FileUp size={18} aria-hidden="true" />{uploadOpen ? "자료 추가 닫기" : "자료 추가"}</button></div>
    <section id={`workplace-${id}-upload`} hidden={!uploadOpen} className={documentStyles.upload} aria-label="자료 추가"><UploadForm context={{ kind: "workplace", id }} /></section>
    <DocumentList context={{ kind: "workplace", id }} variant="workplace" />
    <details className={documentStyles.notice}><summary>공유 자료 이용 안내</summary><p>같은 원본을 여러 급여 사례에 연결할 수 있어요. 연결 해제는 원본을 유지하고, 원본 삭제는 연결된 다른 사례에도 영향을 줘요.</p><p>처리 완료와 검토 확인은 별개예요. 연결한 사례에서 원문과 추출값을 확인해 주세요.</p></details>
  </div>;
}
function RecomputeNotice({ id }: { id: number }) {
  const query = useRecomputeStatus(id);
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  if (!query.data) return <p role="status" className="text-body">서버 갱신 상태 확인 중…</p>;
  return <p role="status" className="text-body text-muted">{recomputeActive(query.data) ? "문서 변경에 따른 서버 결과 갱신 중입니다. 이전 결과는 보존됩니다." : "서버 갱신 상태를 확인했습니다. 작업 종료는 모든 계산의 완료나 일치를 뜻하지 않습니다."}</p>;
}
export function CaseUploadScreen({ id }: { id: number }) {
  const query = useCase(id);
  const removal = useCaseRemoval(id);
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 급여 사례입니다.</p>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  return <CaseDocuments id={id} workplaceId={query.data.workplaceId} workplaceName={(typeof query.data.workplace.name === "string" ? query.data.workplace.name : "\uadfc\ubb34\uc9c0 \uc815\ubcf4 \ubbf8\uc81c\uacf5")} inputVersion={query.data.inputVersion} />;
}
function CaseDocuments({ id, workplaceId, workplaceName, inputVersion }: { id: number; workplaceId: number; workplaceName: string; inputVersion: number }) {
  const [mode, setMode] = useState<"upload" | "link" | "manual">("upload");
  const docs = useDocuments({ kind: "case", id }, { page: 1, size: 20 });
  const canAdd = !!docs.data && !docs.isError && docs.data.total < 20;
  return <div className="document-screen min-w-0 space-y-6">
    <CaseStageHeader stage="upload" title={`${workplaceName} 자료 등록`} description="어떤 방법으로 자료를 준비할까요? 한 가지를 선택해 시작해요." />
    <nav data-case-methods aria-label="자료 등록 방법">{([['upload','새 파일 업로드'],['link','기존 자료 연결'],['manual','직접 입력']] as const).map(([value,label]) => <button key={value} className={secondaryButton} aria-pressed={mode === value} onClick={() => setMode(value)}>{value === "upload" ? <FileUp size={23} aria-hidden="true" /> : value === "link" ? <FolderOpen size={23} aria-hidden="true" /> : <FilePenLine size={23} aria-hidden="true" />}{label}</button>)}</nav>
    {docs.isError && <QueryFeedback error={docs.error} retry={() => { void docs.refetch(); }} />}
    {docs.data && docs.data.total >= 20 && <p role="alert" className={cardStyle}>사례에는 문서를 최대 20개 연결할 수 있습니다. 기존 연결을 해제한 뒤 등록해 주세요.</p>}
    <section data-case-upload hidden={mode !== "upload"} aria-label="새 파일 업로드"><UploadForm context={{ kind: "case", id }} disabled={!canAdd} /></section>
    <section hidden={mode !== "manual"} className={cardStyle} aria-label="직접 입력"><h2 className="text-title font-bold">파일 없이 직접 기록해요</h2><p className="my-4">알고 있는 근무·급여 정보를 입력할 수 있어요.</p><Link className={primaryButton} href={`/cases/${id}/manual-records`}>수기 자료 입력·관리</Link></section>
    <section hidden={mode !== "link"} className="min-w-0 space-y-4" aria-label="근무지 기존 원본 연결"><h2 className="text-title font-bold">근무지의 기존 원본 연결</h2><p className="text-body text-muted">원본을 복사하지 않고 이 사례의 목적과 적용기간을 별도로 저장합니다.</p><DocumentList context={{ kind: "workplace", id: workplaceId }} selectableCaseId={id} inputVersion={inputVersion} canConnect={canAdd} /></section>
    <nav data-case-next aria-label="자료 관련 화면"><div><h2>자료를 준비했다면</h2><p>원문과 추출된 내용을 확인해 주세요.</p></div><Link href={`/cases/${id}/review`} className={secondaryButton}>원문·추출값 검토</Link></nav>
    <details open className={cardStyle}><summary>이 사례에 연결된 자료{docs.data ? ` · ${docs.data.total}개` : ""}</summary><section className="mt-4 space-y-4" aria-label="이 사례에 연결된 자료"><DocumentList context={{ kind: "case", id }} inputVersion={inputVersion} /></section></details>
    <details className={cardStyle}><summary>자료함·등록 안내</summary><div className="mt-4 space-y-4"><DocumentNotice /><RecomputeNotice id={id} /><p className="text-caption text-muted">작업을 전환해도 선택한 파일과 연결 입력은 유지됩니다. 진행 중인 업로드는 계속됩니다.</p><nav className="flex flex-wrap gap-2"><Link className={secondaryButton} href={`/workplaces/${workplaceId}/documents`}>근무지 공유 자료함</Link><Link className={secondaryButton} href="/library">전체 자료함</Link></nav></div></details>
  </div>;
}
