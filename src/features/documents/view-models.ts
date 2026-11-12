
import { translate } from "@/i18n/translate";
import { activeLocale as defaultLocale } from "@/i18n/config";
import { ApiError } from "@/lib/api/error";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { documentTypeErrorCodes, documentTypes, type ConcreteDocumentType, type DocumentDto, type DocumentStatusDto, type LinkDto } from "./schemas";
// Link details come only from a separately confirmed link response, never DocumentDTO.
export interface DocumentViewModel { dto: DocumentDto; linkDetails?: LinkDto }
export function documentStatusView(dto: DocumentDto) {
  return {documentId: dto.documentId, processingStatus: dto.processingStatus, reviewStatus: dto.reviewStatus, progress: dto.progress, errorCode: dto.errorCode};
}
export const typeLabels = { AUTO: translate("documents.viewModels_automatic"), CONTRACT: translate("documents.viewModels_contract"), ATTENDANCE: translate("documents.viewModels_attendance_record"), PAYSLIP: translate("documents.viewModels_payslip"), DEPOSIT: translate("documents.viewModels_deposit_record") };
// AUTO in a stored document means the agent has not classified it yet.
export const storedTypeLabel = (type: DocumentDto["documentType"]) => type === "AUTO" ? translate("documents.viewModels_type_automatic") : typeLabels[type];
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
        ? translate("documents.viewModels_document_selected_type_extraction", { value1: typeLabels[detected], value2: storedTypeLabel(dto.documentType) })
        : translate("documents.viewModels_selected_type_extraction", { value1: storedTypeLabel(dto.documentType) })
      : translate("documents.viewModels_document_type_failure_select_retry_extraction"),
  };
}
export const statusLabels = { UPLOADED: translate("documents.viewModels_processing_pending"), PROCESSING: translate("common.processing"), READ_READY: translate("documents.viewModels_complete_original_field_review_required"), READY: translate("documents.viewModels_processing_complete"), REVIEW_REQUIRED: translate("common.reviewRequired"), FAILED: translate("documents.viewModels_processing_failure") };
export const reviewLabels = { NOT_STARTED: translate("documents.viewModels_review"), IN_PROGRESS: translate("documents.viewModels_review_2"), CONFIRMED: translate("documents.viewModels_review_confirm_complete") };
export const isProcessing = (status?: string) => status === "UPLOADED" || status === "PROCESSING";
export function processingErrorMessage(code: string | null | undefined) {
  if (code === "MODEL_OUTPUT_INVALID") return translate("documents.viewModels_extraction_result_valid_format_original_confirm_document");
  if (code === "DOCUMENT_TYPE_MISMATCH") return translate("documents.viewModels_selected_document_type_automatic_result_confirm");
  if (code === "DOCUMENT_TYPE_UNRESOLVED") return translate("documents.viewModels_document_type_failure_select");
  return code ?? translate("documents.viewModels_document_processing_failure");
}
export function documentCard(dto: DocumentDto, status?: DocumentStatusDto) {
  const effective = { ...dto, ...status };
  return { ...effective, typeLabel: storedTypeLabel(dto.documentType), statusLabel: statusLabels[effective.processingStatus],
    reviewLabel: effective.reviewStatus ? reviewLabels[effective.reviewStatus] : translate("documents.viewModels_review_status_notProvided"),
    uploadedLabel: dto.uploadedAt && Number.isFinite(Date.parse(dto.uploadedAt)) ? new Intl.DateTimeFormat(defaultLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(dto.uploadedAt)) : translate("documents.viewModels_upload_notProvided") };
}
export function documentError(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return translate("documents.viewModels_request_pending_stop_count_list_confirm");
  if (error instanceof ApiError) {
    if (error.errorCode === "MODEL_OUTPUT_INVALID") return translate("documents.viewModels_extraction_result_valid_format_original_confirm_document");
    if (error.status === 401) return translate("documents.viewModels_authentication_expired_retry_login");
    if (error.status === 413) return translate("documents.fileValidation_file_atMost");
    if (error.status === 415) return translate("documents.viewModels_pdf_file_format_confirm");
    if (error.errorCode === "DUPLICATE_DOCUMENT_LINK") return translate("documents.viewModels_link_document_confirm");
    if (error.errorCode === "DOCUMENT_NOT_RETRYABLE") return translate("documents.viewModels_failure_document_processing_count_current_status_confirm");
    if (error.errorCode === "DOCUMENT_SHARED_REFERENCES_EXIST") return translate("documents.viewModels_case_reference_change_delete_impact_retry_confirm");
    if (error.errorCode === "DOCUMENT_STILL_PROCESSING") return translate("documents.viewModels_document_processing_type_count");
    if (error.errorCode === "DOCUMENT_REVIEW_STARTED") return translate("documents.viewModels_confirm_edit_document_type_count_empty_valid");
    if (error.status === 422) return translate("documents.viewModels_file_input_failure_pdf_page_image_applicable");
  }
  return businessErrorMessage(error);
}
