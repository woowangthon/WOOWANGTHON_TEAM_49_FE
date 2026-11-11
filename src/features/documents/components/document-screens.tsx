"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useWorkplace, useWorkplaceRemoval } from "@/features/workplaces/queries";
import { recomputeActive } from "../api";
import { useDocuments, useRecomputeStatus } from "../queries";
import { DocumentList } from "./document-list";
import { UploadForm } from "./upload-form";
export function LibraryScreen() {
  return <div className="document-screen min-w-0 space-y-6"><PageHeading variant="library" title="전체 자료함" description="근무지별 공유 원본과 연결된 급여 사례를 확인합니다." action={<Link className={secondaryButton} href="/workplaces">근무지에서 자료 등록</Link>} /><DocumentNotice /><DocumentList context={{kind: "library"}} /></div>;
}
function DocumentNotice() {
  return <div className="text-caption text-muted"><p>근무지 원본은 여러 사례에서 공유되며, 처리 완료와 검토 확인은 별개입니다.</p><details><summary className="min-h-11 cursor-pointer inline-flex items-center underline">공유와 삭제 안내</summary><p>연결 해제는 원본을 유지하며 원본 삭제는 다른 사례에도 영향을 줍니다. 연결한 사례의 검토 화면에서 원문과 추출값을 확인해 주세요.</p></details></div>;
}
export function WorkplaceDocumentsScreen({ id }: { id: number }) {
  const query = useWorkplace(id);
  const removal = useWorkplaceRemoval(id);
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 근무지입니다.</p>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  return <div className="document-screen min-w-0 space-y-6"><PageHeading variant="library" title={`${query.data.name} 자료함`} description="이 근무지의 공유 원본입니다. 연결 해제와 원본 삭제는 서로 다른 작업입니다." action={<Link href={`/workplaces/${id}`} className={secondaryButton}>근무지 상세</Link>} /><details className={cardStyle}><summary className="cursor-pointer font-bold">자료 추가</summary><UploadForm context={{ kind: "workplace", id }} /></details><DocumentNotice /><DocumentList context={{ kind: "workplace", id }} /></div>;
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
  return <CaseDocuments id={id} workplaceId={query.data.workplaceId} workplaceName={query.data.workplace.name} inputVersion={query.data.inputVersion} />;
}
function CaseDocuments({ id, workplaceId, workplaceName, inputVersion }: { id: number; workplaceId: number; workplaceName: string; inputVersion: number }) {
  const [mode, setMode] = useState<"upload" | "link" | "manual">("upload");
  const docs = useDocuments({ kind: "case", id }, { page: 1, size: 20 });
  const canAdd = !!docs.data && !docs.isError && docs.data.total < 20;
  return <div className="document-screen min-w-0 space-y-6">
    <PageHeading variant="library" title={`${workplaceName} 자료 등록`} description="파일을 새로 올리거나 같은 근무지의 기존 원본을 연결하세요." />
    <nav aria-label="자료 관련 화면" className="document-action-group">
      <Link href={`/cases/${id}/review`} className={primaryButton}>원문·추출값 검토</Link>
      <div className="document-secondary-actions">
        <Link href={`/cases/${id}/conditions`} className={secondaryButton}>조건 확인</Link>
        <details><summary className={secondaryButton}>자료함·관련 화면</summary><div className="flex flex-col gap-2 pt-2">
          <Link className={secondaryButton} href={`/workplaces/${workplaceId}/documents`}>근무지 공유 자료함</Link>
          <Link className={secondaryButton} href="/library">전체 자료함</Link>
          <Link className={secondaryButton} href={`/cases/${id}`}>사례 상세</Link>
        </div></details>
      </div>
    </nav>
    <DocumentNotice /><RecomputeNotice id={id} />
    {docs.data && docs.data.total >= 20 && <p role="alert" className={cardStyle}>사례에는 문서를 최대 20개 연결할 수 있습니다. 기존 연결을 해제한 뒤 등록해 주세요.</p>}
    <nav aria-label="자료 등록 방법" className="flex flex-wrap gap-2">{([['upload','새 파일 업로드'],['link','기존 자료 연결'],['manual','직접 입력']] as const).map(([value,label])=><button key={value} className={secondaryButton} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}</nav>
    <p className="text-caption text-muted">작업을 전환해도 선택한 파일과 연결 입력은 유지됩니다. 진행 중인 업로드는 계속됩니다.</p>
    <section hidden={mode!=="upload"} aria-label="새 파일 업로드"><UploadForm context={{ kind: "case", id }} disabled={!canAdd} /></section>
    <section hidden={mode!=="manual"} className={cardStyle} aria-label="직접 입력"><h2 className="text-title font-bold">직접 입력</h2><p className="my-4">파일 없이 근무·급여 정보를 기록합니다. 기존 입력 화면에서 저장하고 관리할 수 있습니다.</p><Link className={secondaryButton} href={`/cases/${id}/manual-records`}>수기 자료 입력·관리</Link></section>
    <section hidden={mode!=="link"} className="min-w-0 space-y-4" aria-label="근무지 기존 원본 연결"><h2 className="text-title font-bold">근무지의 기존 원본 연결</h2><p className="text-body text-muted">원본을 복사하지 않고 이 사례의 목적과 적용기간을 별도로 저장합니다.</p><DocumentList context={{ kind: "workplace", id: workplaceId }} selectableCaseId={id} inputVersion={inputVersion} canConnect={canAdd} /></section>
    <section className="min-w-0 space-y-4" aria-label="이 사례에 연결된 자료"><h2 className="text-title font-bold">이 사례에 연결된 자료</h2><DocumentList context={{ kind: "case", id }} inputVersion={inputVersion} /></section>
  </div>;
}
