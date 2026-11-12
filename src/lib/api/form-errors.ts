
import { translate } from "@/i18n/translate";
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

import { ApiError } from "./error";

export function businessErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return translate("errors.formErrors_request_processing_failure_retry");
  if (error.kind === "protocol") return translate("errors.formErrors_response_format_document_contract_match_retry");
  if (error.status === 403) return translate("errors.formErrors_record_access_permission_empty");
  if (error.status === 404) return translate("errors.formErrors_record_notFound_delete_access_count_none");
  if (error.errorCode === "INPUT_VERSION_CONFLICT") return translate("errors.formErrors_change_save_current_information_confirm_retry_edit");
  if (error.status === 409) return translate("errors.formErrors_link_record_current_status_request_processing_count");
  if (error.status === 422) return translate("errors.formErrors_input_confirm_request_processing_failure");
  if (error.status === 429) return translate("errors.formErrors_request_retry");
  return translate("errors.formErrors_record_load_saveFailure_link_confirm_retry");
}

export function applyBusinessFormError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly FieldPath<T>[]) {
  if (error instanceof Error && error.name === "AbortError") return;
  let mapped = false;
  if (error instanceof ApiError && error.status === 422) {
    error.fieldErrors.forEach(({ field, reason }) => {
      const key = fields.find((candidate) => candidate === field.split(".").at(-1));
      if (key) { setError(key, { message: reason }, { shouldFocus: !mapped }); mapped = true; }
    });
  }
  if (!mapped) setError("root.server", { message: businessErrorMessage(error) });
}
