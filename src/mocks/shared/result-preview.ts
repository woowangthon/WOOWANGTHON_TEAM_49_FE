import type { Condition, ManualInput } from "@/features/case-inputs/schemas";

/** Synthetic case 16 inputs for the development result preview, never statutory wage results. */
export const resultPreviewInputs: ManualInput[] = [
  { recordType: "CONTRACT", source: "USER_INPUT", data: { monthlyBasePay: 2200000, hourlyWage: 12000 } },
  { recordType: "PAYSLIP", source: "USER_INPUT", data: {
    hourlyWage: 11000, grossPay: 2300000, totalDeductions: 200000, netPay: 2100000,
    paymentItems: [2200000, 100000],
    // The deduction breakdown is deliberately missing; its total check stays incomplete.
  } },
  { recordType: "DEPOSIT", source: "USER_INPUT", data: {
    paymentMethod: "BANK_TRANSFER", transactionDate: "2026-11-05", amount: 2000000,
    sender: "카페 나무 (가상)", memo: "결과 화면 시연용 가상 입금", source: "USER_INPUT", confirmationStatus: "USER_REPORTED",
  } },
];

export const resultPreviewAnswers: Record<string, Condition["value"]> = {
  regular_minutes: 9600,
  base_scope_confirmed: true,
  comparison_basis_confirmed: true,
};
