"use client";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { useCaseRemoval } from "@/features/cases/queries";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";
import { supportApi } from "./api";
import { useSessionGeneration } from "@/hooks/use-app-services";

export function InquiryScreen({ caseId }: { caseId: number }) {
  const generation = useSessionGeneration();
  return <InquiryEditor key={`${generation}:${caseId}`} caseId={caseId}/>;
}
function InquiryEditor({ caseId }: { caseId: number }) {
  const s = useSessionScope();
  const removal = useCaseRemoval(caseId);
  const [text, setText] = useState("");
  const [origin, setOrigin] = useState("직접 작성본");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const lock = useRef(false);
  const mutation = useMutation({ gcTime: 0, mutationFn: () => supportApi(s.api).inquiry(caseId) });
  async function generate() {
    if (lock.current) return;
    lock.current = true;
    setConfirm(false);
    try { await mutation.mutateAsync(); } catch { /* direct editor remains available */ }
    finally { lock.current = false; }
  }
  const error = mutation.error;
  return <div className="t7-support max-w-[760px] min-w-0 space-y-5 [overflow-wrap:anywhere]">
    <CaseStageHeader stage="inquiry" title="회사 문의 문장 검토" description="회사에 확인할 내용을 문장으로 정리해요. 초안을 검토하고 상황에 맞게 다듬어 주세요." />

    <p data-case-notice>서버 초안은 검토용이며 법률적 확정 의견이 아닙니다. 문장을 수정·복사하여 직접 전달하세요. 이 화면에서는 회사로 발송하지 않습니다.</p>
    <section className={`${cardStyle} space-y-4`} aria-label="현재 작성본">    <Textarea id="inquiry-text" label={origin} className="min-h-60" value={text} onChange={e => { setText(e.target.value); setMessage(""); }}/>
    <button className={primaryButton} disabled={!text} onClick={async () => { try { await navigator.clipboard.writeText(text); setMessage("복사했습니다."); } catch { setMessage("복사하지 못했습니다. 문장을 선택해 직접 복사해 주세요."); } }}>문장 복사</button>
    </section>
    <button className={secondaryButton} disabled={mutation.isPending || !s.enabled || removal.pending || removal.removed} onClick={() => { if (text || mutation.data) setConfirm(true); else void generate(); }}>{mutation.isPending ? "초안 생성 중" : mutation.data ? "서버 초안 재생성" : "서버 초안 생성"}</button>
    {confirm && <ConfirmDialog title="초안을 다시 생성할까요?" onClose={() => setConfirm(false)} action={<button className={secondaryButton} onClick={() => void generate()}>재생성</button>}><p>이전 서버 초안이 교체됩니다. 작성 중인 문장은 유지되며 새 초안 적용 시에만 바뀝니다. 필요한 내용은 먼저 복사해 주세요.</p></ConfirmDialog>}
    {error && <><QueryFeedback error={error}/><p role="alert">{error instanceof ApiError && error.errorCode === "REPORT_SOURCE_STALE" ? "결과가 최신 상태가 아닙니다. 결과 갱신 후 다시 생성하세요." : error instanceof ApiError && (error.status === 503 || error.errorCode === "UPSTREAM_UNAVAILABLE") ? "문장 생성 서비스를 사용할 수 없습니다. 잠시 후 재시도하거나 직접 작성하세요." : "초안을 생성하지 못했습니다. 직접 작성은 계속 사용할 수 있습니다."}</p></>}
    {mutation.data && <section className={`${cardStyle} space-y-3`} aria-label="서버 생성 원문"><details><summary>서버 생성 원문 · 적용 및 기준 보기</summary><p className="whitespace-pre-wrap">{mutation.data.text}</p><p>{mutation.data.requiresUserReview === true ? "사용자 검토 필수" : mutation.data.requiresUserReview === false ? "사용자 검토 후 사용하세요" : "검토 메타데이터 미제공 · 사용 전 확인하세요"}</p><p>참조 결과 버전: {mutation.data.basedOnResultVersions ? Object.entries(mutation.data.basedOnResultVersions).map(([k,v]) => `${k}: ${v ?? "미확인"}`).join(" / ") : "미제공"}</p><button className={secondaryButton} onClick={() => { if (text) setMessage("작성본을 보존했습니다. 아래 확인 버튼으로 초안을 적용할 수 있습니다."); else { setText(mutation.data!.text); setOrigin("서버 초안 기반 사용자 작성본"); } }}>초안 편집하기</button>{text && <button className={secondaryButton} onClick={() => setReplaceOpen(true)}>작성본 교체 확인</button>}</details></section>}
    {replaceOpen && <ConfirmDialog title="작성본을 서버 초안으로 교체할까요?" onClose={() => setReplaceOpen(false)} action={<button className={secondaryButton} onClick={() => { if (!replaceOpen || !mutation.data) return; setReplaceOpen(false); setText(mutation.data.text); setOrigin("서버 초안 기반 사용자 작성본"); setMessage("서버 초안으로 교체했습니다. 사용 전 내용을 검토하세요."); }}>작성본 교체</button>}><p>현재 편집 중인 작성본 전체를 위의 서버 생성 원문으로 교체합니다. 기존 작성 내용은 사라집니다. 취소하면 작성본이 유지됩니다.</p></ConfirmDialog>}
    <nav className="flex flex-wrap gap-3"><Link className={secondaryButton} href={`/cases/${caseId}/questions`}>확인 질문</Link><Link className={secondaryButton} href={`/cases/${caseId}/result`}>계산 결과</Link><Link className={secondaryButton} href="/consultation-centers">상담기관</Link><Link className={secondaryButton} href={`/cases/${caseId}/reports`}>보고서</Link></nav>
    <p role="status">{message}</p><p>확인되지 않은 차액은 확정된 미지급임금으로 표현하지 마세요. 작성 내용은 서버에 저장되지 않습니다.</p>
  </div>;
}
