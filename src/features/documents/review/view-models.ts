
import {MessageError} from '@/i18n/message-error';
import {message as describeMessage} from '@/i18n/message';
import { ApiError } from "@/lib/api/error";

import {createLocalizedFeaturesDocumentsViewModels as localized8} from '../view-models';

import type { ExtractedField, FieldValue, PreviewDto, SourceDto } from "./schemas";
import {type Translation} from '@/i18n/translate';

export function createLocalizedFeaturesDocumentsReviewViewModels(translation: Translation) {
  const {translate, locale: defaultLocale} = translation;
const {reviewLabels} = localized8(translation);
const {documentError} = localized8(translation);
const fieldStatusLabels = {UNCONFIRMED:translate("documents.viewModels_confirm"),CONFIRMED:translate("documents.viewModels_confirm_2"),MISSING:translate("documents.viewModels_none"),UNREADABLE:translate("documents.viewModels_fieldStatusLabels_uNREADABLE"),CONFLICTED:translate("documents.viewModels_fieldStatusLabels_cONFLICTED"),DEFERRED:translate("documents.viewModels_fieldStatusLabels_dEFERRED"),NEEDS_RECONFIRMATION:translate("documents.viewModels_confirm_required")};
function displayValue(value: FieldValue) {return value === null ? translate("documents.viewModels_none") : typeof value === "boolean" ? value ? translate("common.yes") : translate("common.no") : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);}
function fieldEditorView(field: ExtractedField, unknownShared = false) {
  const structured = field.value !== null && typeof field.value === "object";
  return {kind: structured ? "structured" as const : "scalar" as const,
    text: unknownShared || field.value === null ? "" : structured ? JSON.stringify(field.value, null, 2) : String(field.value),
    scalar: typeof field.value === "number" || field.valueType === "MONEY_KRW" ? "number" as const : typeof field.value === "boolean" ? "boolean" as const : "string" as const};
}
function reviewStateView(processingStatus: string, reviewStatus: string) {
  const labels: Record<string, string> = reviewLabels;
  return {reviewLabel: Object.hasOwn(labels, reviewStatus) ? labels[reviewStatus] : reviewStatus,
    canAct: ["READ_READY", "READY", "REVIEW_REQUIRED"].includes(processingStatus) && Object.hasOwn(labels, reviewStatus)};
}
function fieldView(field: ExtractedField) {
  return { ...field, canEdit: Number.isSafeInteger(field.fieldId) && field.fieldId > 0, valueLabel: displayValue(field.value), unitLabel: field.valueType === "MONEY_KRW" ? translate("common.won") : field.valueType,
    statusLabel: fieldStatusLabels[field.status], scopeLabel: field.effectiveValueOrigin === "CASE_OVERRIDE" ? translate("documents.viewModels_case_override") : translate("documents.fieldEditor_workplace_sharedDefault"),
    confirmedLabel: field.confirmedAt !== null ? Number.isFinite(Date.parse(field.confirmedAt)) ? new Date(field.confirmedAt).toLocaleString(defaultLocale) : field.confirmedAt : translate("documents.viewModels_confirm_none") };
}
function reviewError(error: unknown, deferred = false) {
  const translate = deferred ? describeMessage : translation.translate;
  if(error instanceof ApiError){
    if(error.errorCode === "DOCUMENT_STILL_PROCESSING") return translate("documents.viewModels_document_processing_current_status_confirm_retry");
    if(error.errorCode === "REPLACEMENT_OVERRIDE_CONFLICT") return translate("documents.viewModels_new_original_override_field_none_format_link");
    if(error.errorCode === "UNRESOLVED_DOCUMENT_FIELDS") return translate("documents.viewModels_confirm_field_review_status_complete_item");
  }
  return documentError(error, deferred);
}
function highlightBox(preview: PreviewDto, source: SourceDto | null | undefined, page: number, intrinsicRotation = 0) {
  if(!source || source.documentId !== preview.documentId || source.page !== page || !preview.supportsHighlight || preview.coordinateSystem !== "RELATIVE_0_1" || source.coordinateSystem !== "RELATIVE_0_1" || preview.rotationDegrees !== 0 || intrinsicRotation !== 0 || !source.boundingBox) return;
  const [x,y,width,height] = source.boundingBox;
  if(![x,y,width,height].every(Number.isFinite) || x<0 || y<0 || width<=0 || height<=0 || x+width>1 || y+height>1) return;
  // Presentation padding only; retain the authoritative source coordinates.
  const padX=Math.min(0.004,width*0.08),padY=Math.min(0.003,height*0.15);
  const left=Math.max(0,x-padX),top=Math.max(0,y-padY);
  const right=Math.min(1,x+width+padX),bottom=Math.min(1,y+height+padY);
  const percent=(value:number)=>`${Number((value*100).toFixed(6))}%`;
  return {left:percent(left),top:percent(top),width:percent(right-left),height:percent(bottom-top)};
}
function parseFieldValue(field: ExtractedField, text: string, empty: boolean, scalar?: "string"|"number"|"boolean"): FieldValue {
  if(field.value !== null && typeof field.value === "object") throw new MessageError("documents.viewModels_use");
  if(empty) return null;
  // Preserve established JSON scalar types. P0 specifies MONEY_KRW; unknown null-valued types require an explicit scalar selection in the form.
  if((scalar??typeof field.value) === "number" || field.valueType === "MONEY_KRW") {
    if(!text.trim() || !Number.isFinite(Number(text))) throw new MessageError("documents.viewModels_input_none_select");
    const value=Number(text);if(field.valueType === "MONEY_KRW" && !Number.isSafeInteger(value)) throw new MessageError("documents.viewModels_unit_count_input");return value;
  }
  if((scalar??typeof field.value) === "boolean") {if(text !== "true" && text !== "false") throw new MessageError("documents.viewModels_select");return text === "true";}
  if(!text.trim()) throw new MessageError("documents.fieldEditor_confirm");
  return text;
}
function recomputeJobLabel(status:string|undefined){
  const labels:Record<string,string>={PENDING:translate("documents.viewModels_pending"),RUNNING:translate("documents.viewModels_run"),SUCCEEDED:translate("documents.viewModels_recomputeJobLabel_labels_sUCCEEDED"),PARTIAL:translate("documents.viewModels_update_complete"),FAILED:translate("documents.viewModels_update_failure"),SUPERSEDED:translate("documents.viewModels_previous_input")};
  return status?(labels[status]??status):translate("documents.viewModels_pending_run_none");
}
return {fieldStatusLabels, displayValue, fieldEditorView, reviewStateView, fieldView, reviewError, highlightBox, parseFieldValue, recomputeJobLabel};
}
