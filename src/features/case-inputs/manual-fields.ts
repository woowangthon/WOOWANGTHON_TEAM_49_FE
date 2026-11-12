import { z } from "zod";
import type { ManualInput, ManualRecord, RecordType } from "./schemas";

export const typeLabels: Record<RecordType, string> = { CONTRACT: "근로계약", ATTENDANCE: "근태", PAYSLIP: "급여명세", DEPOSIT: "입금·현금 수령" };
type Field = { key: string; label: string; kind: "money" | "minutes" | "date" | "datetime" | "list" | "text" | "method"; required?: boolean };
export const manualFields: Record<RecordType, Field[]> = {
  CONTRACT: [{ key: "hourlyWage", label: "시급 (원)", kind: "money" }, { key: "monthlyBasePay", label: "월 기본급 (원)", kind: "money" }],
  ATTENDANCE: [{ key: "workDate", label: "근무일", kind: "date", required: true }, { key: "clockIn", label: "출근 시각 (한국시간)", kind: "datetime", required: true }, { key: "clockOut", label: "퇴근 시각 (한국시간)", kind: "datetime", required: true }, { key: "breakMinutes", label: "휴게시간 (분)", kind: "minutes", required: true }],
  PAYSLIP: [{ key: "grossPay", label: "지급총액 (원)", kind: "money" }, { key: "totalDeductions", label: "공제총액 (원)", kind: "money" }, { key: "netPay", label: "실수령액 (원)", kind: "money" }, { key: "paymentItems", label: "개별 지급액 목록 (원)", kind: "list" }, { key: "deductionItems", label: "개별 공제액 목록 (원)", kind: "list" }, { key: "hourlyWage", label: "시급 (원)", kind: "money" }, { key: "basePay", label: "기본급 (원)", kind: "money" }, { key: "workedMinutes", label: "실근로시간 (분)", kind: "minutes" }],
  DEPOSIT: [{ key: "paymentMethod", label: "수령 수단", kind: "method", required: true }, { key: "transactionDate", label: "수령일", kind: "date", required: true }, { key: "amount", label: "수령액 (원)", kind: "money", required: true }, { key: "sender", label: "보낸 사람", kind: "text" }, { key: "memo", label: "메모", kind: "text" }],
};
const integer = (text: string) => /^-?\d+$/.test(text) && Number.isSafeInteger(Number(text));
export function manualFormSchema(type: RecordType, periodStart: string, periodEnd: string) {
  return z.object({ values: z.record(z.string(), z.string()) }).superRefine(({ values }, ctx) => {
    const error = (key: string, message: string) => ctx.addIssue({ code: "custom", path: ["values", key], message });
    for (const f of manualFields[type]) {
      const v = (values[f.key] ?? "").trim();
      if (!v) { if (f.required) error(f.key, "필수 항목을 입력해 주세요. 실제 0은 0으로 입력하세요."); continue; }
      if (["money", "minutes"].includes(f.kind) && !integer(v)) error(f.key, "안전한 범위의 정수를 입력해 주세요.");
      if (f.kind === "minutes" && Number(v) < 0) error(f.key, "분 단위 값은 0 이상이어야 합니다.");
      if (f.kind === "date" && !z.iso.date().safeParse(v).success) error(f.key, "올바른 날짜를 입력해 주세요.");
      if (f.kind === "datetime" && !z.iso.datetime({ offset: true }).safeParse(`${v.length === 16 ? v + ":00" : v}+09:00`).success) error(f.key, "올바른 날짜와 시각을 입력해 주세요.");
      if (f.kind === "list" && !v.split(/[,\n]/).every(item => integer(item.trim()))) error(f.key, "확인한 개별 정수 금액을 쉼표나 줄바꿈으로 구분하세요.");
      if (f.kind === "method" && !["BANK_TRANSFER", "CASH"].includes(v)) error(f.key, "수령 수단을 선택해 주세요.");
    }
    if (type === "DEPOSIT" && values.amount?.trim() && Number(values.amount) < 0) error("amount", "음수·환입 거래는 지원하지 않습니다.");
    if (type === "ATTENDANCE") {
      if (values.workDate && (values.workDate < periodStart || values.workDate > periodEnd)) error("workDate", "내역 산정기간 안의 근무일을 선택해 주세요.");
      const duration = (Date.parse(values.clockOut + "+09:00") - Date.parse(values.clockIn + "+09:00")) / 60_000;
      if (Number.isFinite(duration) && duration <= 0) error("clockOut", "퇴근 시각은 출근 시각보다 늦어야 합니다.");
      if (Number.isFinite(duration) && values.breakMinutes?.trim() && Number(values.breakMinutes) > duration) error("breakMinutes", "휴게시간은 출퇴근 사이의 시간을 초과할 수 없습니다.");
    }
  });
}
export function manualDefaults(type: RecordType, data: ManualRecord["data"] = {}) {
  return { values: Object.fromEntries(manualFields[type].map(f => {
    const v = data[f.key];
    if (v == null) return [f.key, ""];
    if (f.kind === "datetime" && typeof v === "string" && Number.isFinite(Date.parse(v))) return [f.key, new Date(Date.parse(v) + 9 * 3600_000).toISOString().slice(0, 19)];
    return [f.key, Array.isArray(v) ? v.join(", ") : String(v)];
  })) };
}
export function toManualInput(type: RecordType, values: Record<string, string>, original: ManualRecord["data"] = {}): ManualInput {
  // PATCH replaces all data; preserve unedited fields that a newer server may provide.
  const data = { ...original };
  const originalValues = manualDefaults(type, original).values;
  for (const f of manualFields[type]) {
    const text = (values[f.key] ?? "").trim();
    if (Object.hasOwn(original, f.key) && text === originalValues[f.key]?.trim()) continue;
    if (!text) { if (Object.hasOwn(original, f.key)) data[f.key] = null; else delete data[f.key]; continue; }
    data[f.key] = f.kind === "money" || f.kind === "minutes" ? Number(text) : f.kind === "list" ? text.split(/[,\n]/).map(v => Number(v.trim())) : f.kind === "datetime" ? `${text.length === 16 ? text + ":00" : text}+09:00` : text;
  }
  if (type === "DEPOSIT") { data.source = "USER_INPUT"; data.confirmationStatus = "USER_REPORTED"; }
  return { recordType: type, data, source: "USER_INPUT" };
}
