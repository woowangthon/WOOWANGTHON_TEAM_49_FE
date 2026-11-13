// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { ResultGroup } from "./result-explorer";
import { ResultComparisonTable } from "./result-comparison-table";

afterEach(cleanup);
function fixture(): ResultGroup[] {
  return [
    { id: "calculation", title: "임금 계산 항목", cards: [{ id: "base", title: "계산 전용 항목", status: "CALCULATED", data: { amount: 2200000 }, unit: "KRW" }] },
    { id: "comparison", title: "자료 대조", cards: [{ id: "hourly-0", title: "HOURLY_WAGE", status: "DIFFERENCE", data: { type: "HOURLY_WAGE", contractValue: 12000, attendanceValue: 11800, payslipValue: 11000, difference: 1000 }, unit: "KRW_PER_HOUR" }] },
    { id: "validation", title: "명세서 내부 합계 검사", cards: [
      { id: "paymentTotal", title: "지급 합계", status: "MATCH", data: { itemSum: 2300000, statedTotal: 2300000, difference: 0 }, unit: "KRW" },
      { id: "deductionTotal", title: "공제 합계", status: "INSUFFICIENT_INFORMATION", data: { itemSum: null, statedTotal: 200000, difference: null }, unit: "KRW" },
    ] },
    { id: "deposit", title: "입금 대조", cards: [{ id: "deposit", title: "연결 지급액과 명세서 대조", status: "DIFFERENCE", data: { payslipNetPay: 2100000, linkedPaymentTotal: 2000000, difference: 100000 }, unit: "KRW" }] },
  ];
}
it("shows only comparison-scope counts and exact values with their units", () => {
  render(<ResultComparisonTable groups={fixture()} resultVersion={3} onSelect={vi.fn()}/>);
  expect(screen.getByRole("heading", { name: "항목별 대조표" })).toBeVisible();
  expect(screen.getByText("결과 버전 3")).toBeVisible();
  expect(screen.queryByText("계산 전용 항목")).not.toBeInTheDocument();
  const filters = screen.getByRole("group", { name: "대조표 상태 필터" });
  expect(within(filters).getByRole("button", { name: "전체 (4)" })).toHaveAttribute("aria-pressed", "true");
  expect(within(filters).getByRole("button", { name: "차이 (2)" })).toBeVisible();
  expect(screen.getByText(/현재 대조표의 4개 항목 기준/)).toBeVisible();
  const hourly = screen.getByRole("row", { name: /시급 대조/ });
  expect(within(hourly).getByText("12,000 원/시간")).toBeVisible();
  expect(within(hourly).getByText("11,800 원/시간")).toBeVisible();
  expect(within(hourly).getByText("11,000 원/시간")).toBeVisible();
  expect(within(hourly).getByText("1,000 원/시간")).toBeVisible();
  const deposit = screen.getByRole("row", { name: /연결 지급액과 명세서 대조/ });
  expect(within(deposit).getByText("2,100,000 원")).toBeVisible();
  expect(within(deposit).getByText("2,000,000 원")).toBeVisible();
  expect(within(deposit).getByText("100,000 원")).toBeVisible();
});
it("filters rows independently and opens the exact existing group and card", async () => {
  const user = userEvent.setup(), select = vi.fn();
  render(<ResultComparisonTable groups={fixture()} resultVersion={null} onSelect={select}/>);
  await user.click(screen.getByRole("button", { name: "정보 부족 (1)" }));
  expect(screen.getByRole("row", { name: /공제 합계/ })).toBeVisible();
  expect(screen.queryByRole("row", { name: /시급 대조/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "공제 합계 근거 보기" }));
  expect(select).toHaveBeenCalledWith("validation", "deductionTotal");
  expect(screen.getByText("결과 버전 없음")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "검토 필요 (0)" }));
  expect(screen.getByText(/해당 조건의 대조 항목이 없어요/)).toBeVisible();
});
it("preserves zero, null, absent fields and semantic mismatch without inferring a difference", () => {
  const groups = fixture();
  const hourly = groups[1].cards[0];
  hourly.data = { type: "HOURLY_WAGE", contractValue: 0, payslipValue: null, difference: 999, comparisonBasis: { semanticMatch: false } };
  const payment = groups[2].cards[0];
  payment.data = { itemSum: null, calculated: 888, statedTotal: 0, difference: 0 };
  groups[2].cards[1].data = { statedTotal: 200000 };
  const original = structuredClone(groups);
  render(<ResultComparisonTable groups={groups} resultVersion={0} onSelect={vi.fn()}/>);
  const hourlyRow = screen.getByRole("row", { name: /시급 대조/ });
  expect(within(hourlyRow).getByText("0 원/시간")).toBeVisible();
  expect(within(hourlyRow).getByText("미확정·확정 불가")).toBeVisible();
  expect(within(hourlyRow).getByText("비교 기준 확인 필요")).toBeVisible();
  expect(screen.queryByText("999 원/시간")).not.toBeInTheDocument();
  const paymentRow = screen.getByRole("row", { name: /지급 합계/ });
  expect(within(paymentRow).getByText("미확정·확정 불가")).toBeVisible();
  expect(within(paymentRow).getAllByText("0 원")).toHaveLength(2);
  expect(screen.queryByText("888 원")).not.toBeInTheDocument();
  expect(within(screen.getByRole("row", { name: /공제 합계/ })).getAllByText("미제공")).toHaveLength(2);
  expect(groups).toEqual(original);
});

it.each(["INSUFFICIENT_INFORMATION","REVIEW_REQUIRED"])("renders %s as a text label without a symbol",status=>{
 const groups=fixture();groups[2].cards[1].status=status;
 const {container}=render(<ResultComparisonTable groups={groups} resultVersion={3} onSelect={vi.fn()}/>);
 const badge=container.querySelector(`[data-status="${status}"]`)!;
 expect(badge.querySelector('[aria-hidden]')).toBeNull();
 expect(badge.textContent).toBe(status==="INSUFFICIENT_INFORMATION"?"\uC815\uBCF4 \uBD80\uC871":"\uAC80\uD1A0 \uD544\uC694");
});
