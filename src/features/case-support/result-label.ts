import type { Translation } from "@/i18n/translate";

/** Free-object keys are not user-facing labels; unknown server keys stay private. */
export function supportResultLabel(key: string, {translate}: Pick<Translation, "translate">) {
  switch (key) {
    case "calculation": return translate("caseInputs.inputStatus_wage_calculation");
    case "comparison": return translate("caseInputs.inputStatus_contract_attendance_comparison");
    case "payslipValidation": return translate("caseInputs.inputStatus_payslip_sum_check");
    case "depositComparison": return translate("caseInputs.inputStatus_deposit_comparison");
    default: return translate("common.notProvided");
  }
}
