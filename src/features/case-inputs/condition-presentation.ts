import { conditionAnswerSchema, conditionIds, type Condition, type Conditions } from "./schemas";

const titles: Record<string, string> = {
  workplace_size: "사업장의 상시 근로자는 몇 명인가요?",
  regular_minutes: "이 기간에 일하기로 한 시간을 알려주세요",
  comparison_basis_confirmed: "두 자료의 시급이 같은 기간과 기준을 뜻하나요?",
  hours_basis_confirmed: "두 자료가 같은 기간의 실근로시간을 나타내나요?",
  base_pay_basis_confirmed: "두 자료의 기본급이 같은 기간과 범위를 뜻하나요?",
};
const explanations: Record<string, string> = {
  workplace_size: "일부 수당의 적용 조건을 확인할 때 필요해요. 정확히 알기 어렵다면 모름으로 남겨 주세요.",
  regular_minutes: "계약서 등에 정해진 이 산정기간의 약정 근로시간이에요. 실제로 일한 시간과는 다를 수 있어요.",
  base_scope_confirmed: "임금 항목과 적용 기간을 자료에서 확인해 주세요. 적용 범위가 분명하지 않다면 모름으로 남길 수 있어요.",
  comparison_basis_confirmed: "두 시급이 같은 적용 기간과 임금 기준을 뜻하는지 확인해 주세요. 금액이 같은지를 묻는 질문은 아니에요.",
  hours_basis_confirmed: "실제로 일한 시간과 유급·지급기초시간은 의미가 달라요. 기간과 시간의 의미를 함께 확인해 주세요.",
  base_pay_basis_confirmed: "기본급에 포함된 임금 항목과 적용 기간을 확인해 주세요. 금액이 달라도 비교 기준은 같을 수 있어요.",
};
export const conditionCheckLabels: Record<string, string> = {
  WAGE_CALCULATION: "임금 계산", PAYSLIP_VALIDATION: "명세서 합계 검사",
  DEPOSIT_COMPARISON: "입금 대조", CONTRACT_ATTENDANCE_COMPARISON: "계약·근태 대조",
};
export const conditionTitle = (condition: Condition) => titles[condition.conditionId] ?? condition.question;
export const conditionExplanation = (condition: Condition) => explanations[condition.conditionId] ?? "자료와 함께 아는 내용만 확인해 주세요.";
export const editableCondition = (condition: Condition) => (conditionIds as readonly string[]).includes(condition.conditionId) && condition.status !== "NOT_APPLICABLE" && condition.type === (condition.conditionId === "workplace_size" ? "SELECT" : condition.conditionId === "regular_minutes" ? "NUMBER" : "BOOLEAN");
export const conditionValues = (data: Conditions) => Object.fromEntries(data.conditions.map(condition => [condition.conditionId, condition.value === null ? "" : String(condition.value)]));
export function conditionAnswer(condition: Condition, value: string) {
  if (value.trim() === "" || (condition.type === "NUMBER" && value !== "UNKNOWN" && !/^\d+$/.test(value))) return conditionAnswerSchema.safeParse({ conditionId: condition.conditionId, value: null });
  return conditionAnswerSchema.safeParse({ conditionId: condition.conditionId, value: value === "UNKNOWN" ? value : condition.type === "NUMBER" ? Number(value) : condition.type === "BOOLEAN" ? value === "true" ? true : value === "false" ? false : value : value });
}
export function answerLabel(condition: Condition, value: string) {
  if (condition.status === "NOT_APPLICABLE") return "해당 없음";
  if (value === "") return "미응답";
  if (value === "UNKNOWN") return "모름·확인 예정";
  if (condition.conditionId === "regular_minutes" && condition.type === "NUMBER" && /^\d+$/.test(value)) return `${Math.floor(Number(value) / 60)}시간 ${Number(value) % 60}분`;
  if (condition.conditionId === "regular_minutes" && condition.type === "NUMBER") return "입력 확인 필요";
  if (condition.type === "BOOLEAN") return value === "true" ? "예" : value === "false" ? "아니요" : "답변 확인 필요";
  return ({ LESS_THAN_5: "5인 미만", AT_LEAST_5: "5인 이상" } as Record<string, string>)[value] ?? value;
}
