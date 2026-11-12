
import { translate } from "@/i18n/translate";
import { conditionAnswerSchema, conditionIds, type Condition, type Conditions } from "./schemas";

const titles: Record<string, string> = {
  workplace_size: translate("caseInputs.conditionPresentation_workplace_work"),
  regular_minutes: translate("caseInputs.conditionPresentation_period_time"),
  comparison_basis_confirmed: translate("caseInputs.conditionPresentation_record_hourlyWage_period_basis"),
  hours_basis_confirmed: translate("caseInputs.conditionPresentation_record_period_work_time"),
  base_pay_basis_confirmed: translate("caseInputs.conditionPresentation_record_basePay_period_scope"),
};
const explanations: Record<string, string> = {
  workplace_size: translate("caseInputs.conditionPresentation_allowance_applicable_confirm_required_unknown"),
  regular_minutes: translate("caseInputs.conditionPresentation_contract_wagePeriod_work_time_count"),
  base_scope_confirmed: translate("caseInputs.conditionPresentation_wage_item_applicable_period_record_confirm_scope"),
  comparison_basis_confirmed: translate("caseInputs.conditionPresentation_hourlyWage_applicable_period_wage_basis_confirm_amount"),
  hours_basis_confirmed: translate("caseInputs.conditionPresentation_time_payment_period_confirm"),
  base_pay_basis_confirmed: translate("caseInputs.conditionPresentation_basePay_included_wage_item_applicable_period_confirm"),
};
export const conditionCheckLabels: Record<string, string> = {
  WAGE_CALCULATION: translate("caseInputs.inputStatus_wage_calculation"), PAYSLIP_VALIDATION: translate("caseInputs.inputStatus_payslip_sum_check"),
  DEPOSIT_COMPARISON: translate("caseInputs.inputStatus_deposit_comparison"), CONTRACT_ATTENDANCE_COMPARISON: translate("caseInputs.inputStatus_contract_attendance_comparison"),
};
export const conditionTitle = (condition: Condition) => titles[condition.conditionId] ?? condition.question;
export const conditionExplanation = (condition: Condition) => explanations[condition.conditionId] ?? translate("caseInputs.conditionPresentation_record_content_confirm");
export const editableCondition = (condition: Condition) => (conditionIds as readonly string[]).includes(condition.conditionId) && condition.status !== "NOT_APPLICABLE" && condition.type === (condition.conditionId === "workplace_size" ? "SELECT" : condition.conditionId === "regular_minutes" ? "NUMBER" : "BOOLEAN");
export const conditionValues = (data: Conditions) => Object.fromEntries(data.conditions.map(condition => [condition.conditionId, condition.value === null ? "" : String(condition.value)]));
export function conditionAnswer(condition: Condition, value: string) {
  if (value.trim() === "" || (condition.type === "NUMBER" && value !== "UNKNOWN" && !/^\d+$/.test(value))) return conditionAnswerSchema.safeParse({ conditionId: condition.conditionId, value: null });
  return conditionAnswerSchema.safeParse({ conditionId: condition.conditionId, value: value === "UNKNOWN" ? value : condition.type === "NUMBER" ? Number(value) : condition.type === "BOOLEAN" ? value === "true" ? true : value === "false" ? false : value : value });
}
export function answerLabel(condition: Condition, value: string) {
  if (condition.status === "NOT_APPLICABLE") return translate("caseInputs.conditionPresentation_none");
  if (value === "") return translate("caseInputs.conditionPresentation_unanswered");
  if (value === "UNKNOWN") return translate("caseInputs.conditionPresentation_unknown_confirm");
  if (condition.conditionId === "regular_minutes" && condition.type === "NUMBER" && /^\d+$/.test(value)) return translate("caseInputs.conditionPresentation_time_minutes", { value1: Math.floor(Number(value) / 60), value2: Number(value) % 60 });
  if (condition.conditionId === "regular_minutes" && condition.type === "NUMBER") return translate("caseInputs.conditionPresentation_input_confirm_required");
  if (condition.type === "BOOLEAN") return value === "true" ? translate("common.yes") : value === "false" ? translate("common.no") : translate("caseInputs.conditionPresentation_answer_confirm_required");
  return ({ LESS_THAN_5: translate("caseInputs.conditionsScreen_label_lESSTHAN5_fieldset"), AT_LEAST_5: translate("caseInputs.conditionsScreen_atLeast") } as Record<string, string>)[value] ?? value;
}
