// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ResultScreen } from "./result-screen";
import { resultsSchema, resultsView } from "./schemas";
import { buildResultScenario } from "@/mocks/shared/result-scenario";
import type { CaseDetailDto } from "@/features/cases/schemas";

vi.mock("./result-refresh", () => ({ ResultRefresh: () => null }));
vi.mock("./result-payments", () => ({ ResultPayments: () => null }));
const hooks = vi.hoisted(() => ({ results: vi.fn(), status: vi.fn() }));
vi.mock("./queries", () => ({ useResults: hooks.results }));
vi.mock("@/features/cases/queries", () => ({ useCase: () => ({ data: { caseId: 15 } }) }));
vi.mock("@/features/documents/queries", () => ({ useRecomputeStatus: hooks.status }));
const fixture = () => buildResultScenario({ caseId: 15, inputVersion: 7, periodStart: "2026-01-01", periodEnd: "2026-01-31" } as CaseDetailDto, 2, [], [], []);
const refetch = vi.fn();
function show(wire: unknown, isError = false) {
 const data = resultsView(resultsSchema.parse(wire));
 hooks.results.mockReturnValue({ data, isError, refetch });
 return { data, ...render(<ResultScreen caseId={15}/>) };
}
beforeEach(() => { vi.clearAllMocks(); hooks.status.mockReturnValue({ refetch }); });
afterEach(cleanup);

it("removes the upper CTA and management cards while preserving the bottom navigation", () => {
 const { container } = show(fixture());
 expect(screen.queryByRole("link", { name: "상담 자료 준비" })).not.toBeInTheDocument();
 for (const text of ["결과를 바탕으로 다음을 준비해요", "부족한 정보 보완하기", "입금 거래·배분 관리 및 별도 입금 대조 이력", "계산 상세·작업 상태·버전·이력·수동 실행"]) expect(screen.queryByText(text)).not.toBeInTheDocument();
 const next = screen.getByRole("navigation", { name: "결과 관련 화면" });
 expect(next).toHaveAttribute("data-case-next");
 expect(within(next).getByRole("heading", { name: "확인할 질문을 준비해 볼까요?" })).toBeVisible();
 expect(within(next).getByText("부족한 자료와 회사에 물어볼 내용을 정리해요.")).toBeVisible();
 expect(within(next).getByRole("link", { name: "확인 질문·상담 준비" })).toHaveAttribute("href", "/cases/15/questions");
 expect(container.querySelector("[data-result-summary]")!.compareDocumentPosition(screen.getByRole("heading", { name: "먼저 확인해 보세요" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.getByRole("heading", { name: "항목별 대조표" }).compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("keeps valid server amounts and comparison details visible when another field cannot be interpreted", async () => {
 const wire = fixture();
 wire.calculation!.grossPay = 0;
 wire.calculation!.calculatedSubtotal = null;
 const { data } = show({ ...wire, summary: { ...wire.summary, counts: { ...wire.summary.counts, match: "invalid" } } });
 expect(data.interpretation).toBe("interpretation-error");
 const summary = screen.getByRole("region", { name: "임금 결과 요약" });
 expect(within(summary).getByText("0 원")).toBeVisible();
 expect(within(summary).getByText("미확정")).toBeVisible();
 expect(screen.queryByText("결과 표시 해석에 실패했습니다. 원본 데이터는 보존했습니다.")).not.toBeInTheDocument();
 expect(screen.getByText(/자료상 일치/)).toHaveTextContent("미제공개");
 expect(screen.queryByRole("region", { name: "결과 탐색" })).not.toBeInTheDocument();
 await userEvent.setup().click(screen.getByRole("button", { name: "시급 대조 근거 보기" }));
 expect(screen.getByRole("region", { name: "결과 탐색" })).toBeVisible();
 expect(screen.getByRole("article", { name: "시급 대조 상세" })).toBeVisible();
});

it("uses existing fallback for invalid calculation data without hiding valid comparison rows", () => {
 const wire = fixture();
 const { data } = show({ ...wire, calculation: { ...wire.calculation, grossPay: "invalid" } });
 expect(data.calculation).toBeNull();
 expect(data.interpretation).toBe("interpretation-error");
 expect(screen.queryByText("결과 표시 해석에 실패했습니다. 원본 데이터는 보존했습니다.")).not.toBeInTheDocument();
 const summary = screen.getByRole("region", { name: "임금 결과 요약" });
 expect(within(summary).getByText(/계산할 정보가/)).toBeVisible();
 expect(within(summary).queryByText("0 원")).not.toBeInTheDocument();
 expect(screen.getByRole("button", { name: "시급 대조 근거 보기" })).toBeVisible();
});

it.each(["STALE", "UPDATING", "FAILED"])("preserves %s freshness and version information", async freshness => {
 const wire = fixture();
 show({ ...wire, freshness: { ...wire.freshness, overall: freshness } });
 expect(screen.getAllByText(/이전 입력 기준 결과입니다/).length).toBeGreaterThan(0);
 expect(screen.getByText(/현재 입력 v7 · 결과 v2/)).toBeVisible();
 if (freshness === "FAILED") {
  expect(screen.getByRole("alert")).toHaveTextContent("결과 갱신에 실패해 이전 결과를 보여 드려요.");
  expect(screen.queryByText(/아래 보조 관리/)).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "갱신 상태 다시 확인" }));
  expect(refetch).toHaveBeenCalledTimes(2);
 }
});

it("keeps cached results visible with an unverified freshness warning after a query failure", () => {
 show(fixture(), true);
 expect(screen.getByRole("alert")).toHaveTextContent("최신 결과 조회에 실패해 직전 조회 결과를 보존합니다.");
 expect(screen.getByRole("region", { name: "임금 결과 요약" })).toHaveTextContent("직전 조회 결과 · 최신성 미확인");
 expect(screen.getByRole("heading", { name: "항목별 대조표" })).toBeVisible();
 expect(screen.getByRole("navigation", { name: "결과 관련 화면" })).toBeVisible();
});
