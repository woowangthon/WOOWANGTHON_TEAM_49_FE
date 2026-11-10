"use client";
import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useCase, useCaseRemoval } from "@/features/cases/queries";
import { useWorkplace, useWorkplaceRemoval } from "@/features/workplaces/queries";
import { recomputeActive } from "../api";
import { useDocuments, useRecomputeStatus } from "../queries";
import { DocumentList } from "./document-list";
import { UploadForm } from "./upload-form";
export function LibraryScreen() {
  return <div className="min-w-0 space-y-6"><PageHeading variant="library" title="전체 자료함" description="근무지별 공유 원본과 연결된 급여 사례를 확인합니다." action={<Link className={secondaryButton} href="/workplaces">근무지에서 자료 등록</Link>} /><DocumentNotice /><DocumentList context={{kind: "library"}} /></div>;
}
function DocumentNotice() {
  return <p className="rounded-control bg-neutral-soft p-4 text-body">처리 완료(READY)는 사용자 검토 확인(CONFIRMED)과 다릅니다. 연결된 사례의 검토 화면에서 원문과 추출값을 확인해 주세요.</p>;
}
export function WorkplaceDocumentsScreen({ id }: { id: number }) {
  const query = useWorkplace(id);
  const removal = useWorkplaceRemoval(id);
  if (removal.pending || removal.removed) return <p role="status">삭제 중이거나 삭제된 근무지입니다.</p>;
  if (query.isPending) return <QueryFeedback pending />;
  if (query.isError) return <QueryFeedback error={query.error} retry={() => { void query.refetch(); }} />;
  return <div className="min-w-0 space-y-6"><PageHeading variant="library" title={`${query.data.name} 자료함`} description="이 근무지의 공유 원본입니다. 연결 해제와 원본 삭제는 서로 다른 작업입니다." action={<Link href={`/workplaces/${id}`} className={secondaryButton}>근무지 상세</Link>} /><DocumentNotice /><UploadForm context={{ kind: "workplace", id }} /><DocumentList context={{ kind: "workplace", id }} /></div>;
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
  const docs = useDocuments({ kind: "case", id }, { page: 1, size: 20 });
  const canAdd = !!docs.data && !docs.isError && docs.data.total < 20;
  return <div className="min-w-0 space-y-6">
    <PageHeading variant="library" title={`${workplaceName} 자료 등록`} description="파일을 새로 올리거나 같은 근무지의 기존 원본을 연결하세요." action={<Link href={`/cases/${id}`} className={secondaryButton}>사례 상세</Link>} />
    <div className="flex flex-wrap gap-3"><Link className={secondaryButton} href={`/workplaces/${workplaceId}/documents`}>근무지 공유 자료함</Link><Link className={secondaryButton} href="/library">전체 자료함</Link></div>
    <Link href={`/cases/${id}/review`} className={secondaryButton}>원문·추출값 검토</Link>
    <div className="flex flex-wrap gap-3"><Link href={`/cases/${id}/manual-records`} className={secondaryButton}>수기 자료 입력·관리</Link><Link href={`/cases/${id}/conditions`} className={secondaryButton}>계산 조건·실행 가능성</Link></div>
    <DocumentNotice /><RecomputeNotice id={id} />
    {docs.data && docs.data.total >= 20 && <p role="alert" className={cardStyle}>사례에는 문서를 최대 20개 연결할 수 있습니다. 기존 연결을 해제한 뒤 등록해 주세요.</p>}
    <UploadForm context={{ kind: "case", id }} disabled={!canAdd} />
    <section className="min-w-0 space-y-4" aria-label="이 사례에 연결된 자료"><h2 className="text-title font-bold">이 사례에 연결된 자료</h2><DocumentList context={{ kind: "case", id }} inputVersion={inputVersion} /></section>
    <section className="min-w-0 space-y-4" aria-label="근무지 기존 원본 연결"><h2 className="text-title font-bold">근무지의 기존 원본 연결</h2><p className="text-body text-muted">원본을 복사하지 않고 이 사례의 목적과 적용기간을 별도로 저장합니다.</p><DocumentList context={{ kind: "workplace", id: workplaceId }} selectableCaseId={id} inputVersion={inputVersion} canConnect={canAdd} /></section>
  </div>;
}
