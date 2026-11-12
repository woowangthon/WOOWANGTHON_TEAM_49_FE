import type { DocumentDto } from "../schemas";
import type { ExtractedField } from "./schemas";

// Presentation priorities only. All returned fields retain their server review state.
const essentialKeys: Record<DocumentDto["documentType"], readonly string[]> = {
  AUTO: [],
  PAYSLIP: ["periodStart", "periodEnd", "grossPay", "deductions", "totalDeductions", "netPay"],
  CONTRACT: ["periodStart", "periodEnd", "payType", "hourlyWage", "monthlyBasePay", "regularMinutes"],
  ATTENDANCE: ["workDate", "clockIn", "clockOut", "breakMinutes"],
  DEPOSIT: ["transactionDate", "amount", "sender", "paymentMethod"],
};

export function groupReviewFields(fields: ExtractedField[], documentType: DocumentDto["documentType"]) {
  const keys = essentialKeys[documentType];
  const isCore = (field: ExtractedField) => keys.includes(field.key) || isExtractionMissing(field);
  return {
    essential: fields.filter(isCore),
    details: fields.filter(field => !isCore(field)),
  };
}

export function isExtractionMissing(field: ExtractedField) {
  return hasMissingFieldValue(field) || field.status === "MISSING" || field.status === "UNREADABLE";
}

export function hasMissingFieldValue(field: ExtractedField) {
  return field.value == null || (typeof field.value === "string" && field.value.trim() === "");
}
