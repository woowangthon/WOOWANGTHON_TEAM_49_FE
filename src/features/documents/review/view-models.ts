import { ApiError } from "@/lib/api/error";
import { reviewLabels } from "../view-models";
import { documentError } from "../view-models";
import type { ExtractedField, FieldValue, PreviewDto, SourceDto } from "./schemas";
export const fieldStatusLabels = {UNCONFIRMED:"미확인",CONFIRMED:"확인됨",MISSING:"값 없음",UNREADABLE:"판독 불가",CONFLICTED:"상충",DEFERRED:"보류",NEEDS_RECONFIRMATION:"재확인 필요"};
export function displayValue(value: FieldValue) {return value === null ? "값 없음" : typeof value === "boolean" ? value ? "예" : "아니요" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);}
export function fieldEditorView(field: ExtractedField, unknownShared = false) {
  const structured = field.value !== null && typeof field.value === "object";
  return {kind: structured ? "structured" as const : "scalar" as const,
    text: unknownShared || field.value === null ? "" : structured ? JSON.stringify(field.value, null, 2) : String(field.value),
    empty: !unknownShared && field.value === null, confirmed: false,
    scalar: typeof field.value === "number" || field.valueType === "MONEY_KRW" ? "number" as const : typeof field.value === "boolean" ? "boolean" as const : "string" as const};
}
export function reviewStateView(processingStatus: string, reviewStatus: string) {
  const labels: Record<string, string> = reviewLabels;
  return {reviewLabel: Object.hasOwn(labels, reviewStatus) ? labels[reviewStatus] : reviewStatus,
    canAct: ["READ_READY", "READY", "REVIEW_REQUIRED"].includes(processingStatus) && Object.hasOwn(labels, reviewStatus)};
}
export function fieldView(field: ExtractedField) {
  return { ...field, canEdit: Number.isSafeInteger(field.fieldId) && field.fieldId > 0, valueLabel: displayValue(field.value), unitLabel: field.valueType === "MONEY_KRW" ? "원" : field.valueType,
    statusLabel: fieldStatusLabels[field.status], scopeLabel: field.effectiveValueOrigin === "CASE_OVERRIDE" ? "이 사례의 재정의" : "근무지 공유 기본값",
    confirmedLabel: field.confirmedAt !== null ? Number.isFinite(Date.parse(field.confirmedAt)) ? new Date(field.confirmedAt).toLocaleString("ko-KR") : field.confirmedAt : "확인 시각 없음" };
}
export function reviewError(error: unknown) {
  if(error instanceof ApiError){
    if(error.errorCode === "DOCUMENT_STILL_PROCESSING") return "문서를 처리 중입니다. 최신 처리 상태를 확인한 뒤 다시 시도해 주세요.";
    if(error.errorCode === "REPLACEMENT_OVERRIDE_CONFLICT") return "새 원본에 기존 재정의와 대응하는 필드가 없거나 형식이 다릅니다. 기존 연결을 유지했습니다. 새 원본과 재정의를 확인해 주세요.";
    if(error.errorCode === "UNRESOLVED_DOCUMENT_FIELDS") return "확인하지 못한 필드가 남아 있습니다. 아래 검토 상태와 미완료 항목을 확인해 주세요.";
  }
  return documentError(error);
}
export function highlightBox(preview: PreviewDto, source: SourceDto | null | undefined, page: number, intrinsicRotation = 0) {
  if(!source || source.documentId !== preview.documentId || source.page !== page || !preview.supportsHighlight || preview.coordinateSystem !== "RELATIVE_0_1" || source.coordinateSystem !== "RELATIVE_0_1" || preview.rotationDegrees !== 0 || intrinsicRotation !== 0 || !source.boundingBox) return;
  const [x,y,width,height] = source.boundingBox;
  if(![x,y,width,height].every(Number.isFinite) || x<0 || y<0 || width<=0 || height<=0 || x+width>1 || y+height>1) return;
  return {left:`${x*100}%`,top:`${y*100}%`,width:`${width*100}%`,height:`${height*100}%`};
}
export function parseFieldValue(field: ExtractedField, text: string, empty: boolean, scalar?: "string"|"number"|"boolean"): FieldValue {
  if(field.value !== null && typeof field.value === "object") throw new Error("구조형 값은 JSON 편집기를 사용해 주세요.");
  if(empty) return null;
  // Preserve established JSON scalar types. P0 specifies MONEY_KRW; unknown null-valued types require an explicit scalar selection in the form.
  if((scalar??typeof field.value) === "number" || field.valueType === "MONEY_KRW") {
    if(!text.trim() || !Number.isFinite(Number(text))) throw new Error("숫자를 입력해 주세요. 값이 없으면 ‘값 없음’을 선택하세요.");
    const value=Number(text);if(field.valueType === "MONEY_KRW" && !Number.isSafeInteger(value)) throw new Error("원 단위 정수를 입력해 주세요.");return value;
  }
  if((scalar??typeof field.value) === "boolean") {if(text !== "true" && text !== "false") throw new Error("예 또는 아니요를 선택해 주세요.");return text === "true";}
  return text;
}

export function recomputeJobLabel(status:string|undefined){
  const labels:Record<string,string>={PENDING:"작업 대기",RUNNING:"작업 실행 중",SUCCEEDED:"작업 종료",PARTIAL:"일부 갱신 완료",FAILED:"갱신 실패",SUPERSEDED:"이전 입력의 작업"};
  return status?(labels[status]??status):"대기·실행 작업 없음";
}
