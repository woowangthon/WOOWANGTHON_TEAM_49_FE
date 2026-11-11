import { ApiError } from "@/lib/api/error";
import { businessErrorMessage } from "@/lib/api/form-errors";
import type { DocumentDto, DocumentStatusDto, LinkDto } from "./schemas";
// Link details come only from a separately confirmed link response, never DocumentDTO.
export interface DocumentViewModel { dto: DocumentDto; linkDetails?: LinkDto }
export const typeLabels = { CONTRACT: "근로계약서", ATTENDANCE: "근태 자료", PAYSLIP: "급여명세서", DEPOSIT: "입금 자료" };
export const statusLabels = { UPLOADED: "처리 대기", PROCESSING: "처리 중", READ_READY: "읽기 완료 · 원문과 필드 검토 필요", READY: "처리 완료", REVIEW_REQUIRED: "검토 필요", FAILED: "처리 실패" };
export const reviewLabels = { NOT_STARTED: "검토 전", IN_PROGRESS: "검토 중", CONFIRMED: "검토 확인 완료" };
export const isProcessing = (status?: string) => status === "UPLOADED" || status === "PROCESSING";
export function documentCard(dto: DocumentDto, status?: DocumentStatusDto) {
  const effective = { ...dto, ...status };
  return { ...effective, typeLabel: typeLabels[dto.documentType], statusLabel: statusLabels[effective.processingStatus],
    reviewLabel: effective.reviewStatus ? reviewLabels[effective.reviewStatus] : "검토 상태 미제공",
    uploadedLabel: dto.uploadedAt && Number.isFinite(Date.parse(dto.uploadedAt)) ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dto.uploadedAt)) : "업로드 시각 미제공" };
}
export function documentError(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return "요청 대기를 중단했습니다. 서버에는 접수되었을 수 있으니 목록을 먼저 확인해 주세요.";
  if (error instanceof ApiError) {
    if (error.status === 401) return "인증이 만료되었습니다. 다시 로그인해 주세요.";
    if (error.status === 413) return "파일은 20MiB 이하여야 합니다.";
    if (error.status === 415) return "PDF, JPEG, PNG 파일만 지원합니다. 실제 파일 형식과 확장자를 확인해 주세요.";
    if (error.errorCode === "DUPLICATE_DOCUMENT_LINK") return "이미 연결된 문서입니다. 기존 연결을 확인해 주세요.";
    if (error.errorCode === "DOCUMENT_NOT_RETRYABLE") return "실패한 문서만 재처리할 수 있습니다. 최신 상태를 확인해 주세요.";
    if (error.errorCode === "DOCUMENT_SHARED_REFERENCES_EXIST") return "다른 사례의 참조가 변경되었습니다. 삭제 영향을 다시 확인해 주세요.";
    if (error.status === 422) return "파일 또는 입력값이 서버 검증을 통과하지 못했습니다. PDF 50페이지, 암호화·손상 여부, 이미지 각 축 10000px 및 적용기간을 확인해 주세요.";
  }
  return businessErrorMessage(error);
}
