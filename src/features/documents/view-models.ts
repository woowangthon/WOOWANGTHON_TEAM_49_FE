import { ApiError } from "@/lib/api/error";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { documentTypeErrorCodes, documentTypes, type ConcreteDocumentType, type DocumentDto, type DocumentStatusDto, type LinkDto } from "./schemas";
// Link details come only from a separately confirmed link response, never DocumentDTO.
export interface DocumentViewModel { dto: DocumentDto; linkDetails?: LinkDto }
export function documentStatusView(dto: DocumentDto) {
  return {documentId: dto.documentId, processingStatus: dto.processingStatus, reviewStatus: dto.reviewStatus, progress: dto.progress, errorCode: dto.errorCode};
}
export const typeLabels = { AUTO: "자동 인식", CONTRACT: "근로계약서", ATTENDANCE: "근태 자료", PAYSLIP: "급여명세서", DEPOSIT: "입금 자료" };
// AUTO in a stored document means the agent has not classified it yet.
export const storedTypeLabel = (type: DocumentDto["documentType"]) => type === "AUTO" ? "유형 자동 인식 전" : typeLabels[type];
/** Type decision required by the server (P0 errorCode + aiMetadata.detectedType); undefined otherwise. */
export function documentTypeIssue(dto: Pick<DocumentDto, "documentType" | "aiMetadata">, errorCode: string | null | undefined) {
  if (!errorCode || !(documentTypeErrorCodes as readonly string[]).includes(errorCode)) return undefined;
  const raw = dto.aiMetadata?.detectedType;
  const detected = (documentTypes as readonly unknown[]).includes(raw) ? raw as ConcreteDocumentType : undefined;
  const mismatch = errorCode === "DOCUMENT_TYPE_MISMATCH";
  return {
    code: errorCode as typeof documentTypeErrorCodes[number],
    detected: mismatch ? detected : undefined,
    message: mismatch
      ? detected
        ? `AI가 이 문서를 ${typeLabels[detected]}(으)로 판단했습니다. 선택한 유형(${storedTypeLabel(dto.documentType)})과 달라 값을 추출하지 않았습니다.`
        : `선택한 유형(${storedTypeLabel(dto.documentType)})과 AI가 판단한 유형이 달라 값을 추출하지 않았습니다.`
      : "AI가 문서 유형을 판단하지 못했습니다. 문서 유형을 선택하면 다시 추출합니다.",
  };
}
export const statusLabels = { UPLOADED: "처리 대기", PROCESSING: "처리 중", READ_READY: "읽기 완료 · 원문과 필드 검토 필요", READY: "처리 완료", REVIEW_REQUIRED: "검토 필요", FAILED: "처리 실패" };
export const reviewLabels = { NOT_STARTED: "검토 전", IN_PROGRESS: "검토 중", CONFIRMED: "검토 확인 완료" };
export const isProcessing = (status?: string) => status === "UPLOADED" || status === "PROCESSING";
export function processingErrorMessage(code: string | null | undefined) {
  if (code === "MODEL_OUTPUT_INVALID") return "AI 추출 결과가 올바른 형식이 아닙니다. 원문을 확인한 뒤 문서를 재처리해 주세요.";
  if (code === "DOCUMENT_TYPE_MISMATCH") return "선택한 문서 유형과 자동 판별 결과가 다릅니다. 문서 유형을 확인해 주세요.";
  if (code === "DOCUMENT_TYPE_UNRESOLVED") return "문서 유형을 판별하지 못했습니다. 유형을 직접 선택해 주세요.";
  return code ?? "문서 처리에 실패했습니다.";
}
export function documentCard(dto: DocumentDto, status?: DocumentStatusDto) {
  const effective = { ...dto, ...status };
  return { ...effective, typeLabel: storedTypeLabel(dto.documentType), statusLabel: statusLabels[effective.processingStatus],
    reviewLabel: effective.reviewStatus ? reviewLabels[effective.reviewStatus] : "검토 상태 미제공",
    uploadedLabel: dto.uploadedAt && Number.isFinite(Date.parse(dto.uploadedAt)) ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dto.uploadedAt)) : "업로드 시각 미제공" };
}
export function documentError(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return "요청 대기를 중단했습니다. 서버에는 접수되었을 수 있으니 목록을 먼저 확인해 주세요.";
  if (error instanceof ApiError) {
    if (error.errorCode === "MODEL_OUTPUT_INVALID") return "AI 추출 결과가 올바른 형식이 아닙니다. 원문을 확인한 뒤 문서를 재처리해 주세요.";
    if (error.status === 401) return "인증이 만료되었습니다. 다시 로그인해 주세요.";
    if (error.status === 413) return "파일은 20MiB 이하여야 합니다.";
    if (error.status === 415) return "PDF, JPEG, PNG 파일만 지원합니다. 실제 파일 형식과 확장자를 확인해 주세요.";
    if (error.errorCode === "DUPLICATE_DOCUMENT_LINK") return "이미 연결된 문서입니다. 기존 연결을 확인해 주세요.";
    if (error.errorCode === "DOCUMENT_NOT_RETRYABLE") return "실패한 문서만 재처리할 수 있습니다. 최신 상태를 확인해 주세요.";
    if (error.errorCode === "DOCUMENT_SHARED_REFERENCES_EXIST") return "다른 내역의 참조가 변경되었습니다. 삭제 영향을 다시 확인해 주세요.";
    if (error.errorCode === "DOCUMENT_STILL_PROCESSING") return "문서를 처리 중입니다. 처리가 끝난 뒤 문서 유형을 바꿀 수 있습니다.";
    if (error.errorCode === "DOCUMENT_REVIEW_STARTED") return "이미 확인하거나 수정한 값이 있어 문서 유형을 바꿀 수 없습니다. 올바른 유형으로 새 파일을 올려 주세요.";
    if (error.status === 422) return "파일 또는 입력값이 서버 검증을 통과하지 못했습니다. PDF 50페이지, 암호화·손상 여부, 이미지 각 축 10000px 및 적용기간을 확인해 주세요.";
  }
  return businessErrorMessage(error);
}
