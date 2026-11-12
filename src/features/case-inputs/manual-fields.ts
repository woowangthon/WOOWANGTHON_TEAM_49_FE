
import { translate } from "@/i18n/translate";
import { z } from "zod";
import type { ManualInput, ManualRecord, RecordType } from "./schemas";

export const typeLabels: Record<RecordType, string> = { CONTRACT: translate("caseInputs.manualFields_work_contract"), ATTENDANCE: translate("caseInputs.manualFields_attendance"), PAYSLIP: translate("caseInputs.manualFields_wage"), DEPOSIT: translate("caseInputs.manualFields_deposit_cash_count") };
type Field = { key: string; label: string; kind: "money" | "minutes" | "date" | "datetime" | "list" | "text" | "method"; required?: boolean };
export const manualFields: Record<RecordType, Field[]> = {
  CONTRACT: [{ key: "hourlyWage", label: translate("caseInputs.manualFields_hourlyWage"), kind: "money" }, { key: "monthlyBasePay", label: translate("caseInputs.manualFields_basePay"), kind: "money" }],
  ATTENDANCE: [{ key: "workDate", label: translate("caseInputs.manualFields_work"), kind: "date", required: true }, { key: "clockIn", label: translate("caseInputs.manualFields_time"), kind: "datetime", required: true }, { key: "clockOut", label: translate("caseInputs.manualFields_time_2"), kind: "datetime", required: true }, { key: "breakMinutes", label: translate("caseInputs.manualFields_time_minutes"), kind: "minutes", required: true }],
  PAYSLIP: [{ key: "grossPay", label: translate("caseInputs.manualFields_payment_total"), kind: "money" }, { key: "totalDeductions", label: translate("caseInputs.manualFields_deduction_total"), kind: "money" }, { key: "netPay", label: translate("caseInputs.manualFields_netPay"), kind: "money" }, { key: "paymentItems", label: translate("caseInputs.manualFields_payment_list"), kind: "list" }, { key: "deductionItems", label: translate("caseInputs.manualFields_deduction_list"), kind: "list" }, { key: "hourlyWage", label: translate("caseInputs.manualFields_hourlyWage"), kind: "money" }, { key: "basePay", label: translate("caseInputs.manualFields_basePay_2"), kind: "money" }, { key: "workedMinutes", label: translate("caseInputs.manualFields_work_time_minutes"), kind: "minutes" }],
  DEPOSIT: [{ key: "paymentMethod", label: translate("caseInputs.manualFields_count"), kind: "method", required: true }, { key: "transactionDate", label: translate("caseInputs.manualFields_count_2"), kind: "date", required: true }, { key: "amount", label: translate("caseInputs.manualFields_count_3"), kind: "money", required: true }, { key: "sender", label: translate("caseInputs.manualFields_manualFields_dEPOSIT_label4"), kind: "text" }, { key: "memo", label: translate("caseInputs.manualFields_manualFields_dEPOSIT_label5"), kind: "text" }],
};
const integer = (text: string) => /^-?\d+$/.test(text) && Number.isSafeInteger(Number(text));
export function manualFormSchema(type: RecordType, periodStart: string, periodEnd: string) {
  return z.object({ values: z.record(z.string(), z.string()) }).superRefine(({ values }, ctx) => {
    const error = (key: string, message: string) => ctx.addIssue({ code: "custom", path: ["values", key], message });
    for (const f of manualFields[type]) {
      const v = (values[f.key] ?? "").trim();
      if (!v) { if (f.required) error(f.key, translate("caseInputs.manualFields_count_item_input")); continue; }
      if (["money", "minutes"].includes(f.kind) && !integer(v)) error(f.key, translate("caseInputs.manualFields_scope_count_input"));
      if (f.kind === "minutes" && Number(v) < 0) error(f.key, translate("caseInputs.manualFields_minutes_unit_atLeast"));
      if (f.kind === "date" && !z.iso.date().safeParse(v).success) error(f.key, translate("caseInputs.manualFields_valid_input"));
      if (f.kind === "datetime" && !z.iso.datetime({ offset: true }).safeParse(`${v.length === 16 ? v + ":00" : v}+09:00`).success) error(f.key, translate("caseInputs.manualFields_valid_input_2"));
      if (f.kind === "list" && !v.split(/[,\n]/).every(item => integer(item.trim()))) error(f.key, translate("caseInputs.manualFields_confirm_count_amount_minutes"));
      if (f.kind === "method" && !["BANK_TRANSFER", "CASH"].includes(v)) error(f.key, translate("caseInputs.manualFields_count_select"));
    }
    if (type === "DEPOSIT" && values.amount?.trim() && Number(values.amount) < 0) error("amount", translate("caseInputs.manualFields_count_transaction"));
    if (type === "ATTENDANCE") {
      if (values.workDate && (values.workDate < periodStart || values.workDate > periodEnd)) error("workDate", translate("caseInputs.manualFields_case_wagePeriod_work_select"));
      const duration = (Date.parse(values.clockOut + "+09:00") - Date.parse(values.clockIn + "+09:00")) / 60_000;
      if (Number.isFinite(duration) && duration <= 0) error("clockOut", translate("caseInputs.manualFields_manualFormSchema10"));
      if (Number.isFinite(duration) && values.breakMinutes?.trim() && Number(values.breakMinutes) > duration) error("breakMinutes", translate("caseInputs.manualFields_time_exceeded_count_empty"));
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
