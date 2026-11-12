// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { buildResultScenario } from "@/mocks/shared/result-scenario";
import { toResultsViewModel } from "./view-models";
import { ResultSummary, ResultItem, ResultChecks, ResultNextSteps } from "./result-presentation";
import type { CaseDetailDto } from "@/features/cases/schemas";
afterEach(cleanup);
function fixture(){return buildResultScenario({caseId:15,inputVersion:7,periodStart:"2026-01-01",periodEnd:"2026-01-31"} as CaseDetailDto,2,[],[],[]);}
it("retains every DTO field and item reference including future evidence fields",()=>{const d=fixture();d.items[0].extraEvidence={reason:"kept"};const vm=toResultsViewModel(d);expect(vm.dto).toBe(d);expect(vm.items.map(i=>i.dto)).toEqual(d.items);expect(vm.items[0].dto.extraEvidence).toEqual({reason:"kept"});});
it.each(["CURRENT","STALE","UPDATING","FAILED"] as const)("shows freshness %s and partial scope",freshness=>{const d=fixture();d.freshness.overall=freshness;d.calculation!.status="PARTIAL";d.summary.calculationStatus="PARTIAL";render(<ResultSummary value={toResultsViewModel(d)}/>);expect(screen.getByRole("status").textContent).toMatch(freshness==="CURRENT"?/현재 입력/:/이전 입력/);expect(screen.getByText("부분 계산")).toBeVisible();});
it("shows zero separately from null with units and keeps evidence in disclosure",()=>{const d=fixture();d.items[0].calculatedValue=0;d.items[0].documentValue=null;render(<ResultItem caseId={15} item={toResultsViewModel(d).items[0]}/>);expect(screen.getAllByText("0 원/시간")[0]).toBeVisible();expect(screen.getAllByText("미확정·확정 불가").length).toBeGreaterThan(0);expect(screen.getByText("근거·계산식·검토 사유 펼치기").closest("details")).not.toHaveAttribute("open");});
it("keeps independent statuses and values without synthesizing a total status",()=>{const d=fixture();d.payslipValidation!.paymentTotal.status="MATCH";d.payslipValidation!.deductionTotal.status="DIFFERENCE";d.payslipValidation!.netPay.status="REVIEW_REQUIRED";render(<ResultChecks caseId={15} value={toResultsViewModel(d)}/>);expect(screen.getByText("✓ 자료상 일치")).toBeVisible();expect(screen.getByText(/△ 차이 발견/)).toBeVisible();expect(screen.getByText("! 검토 필요")).toBeVisible();});

it("places the server gross amount first while preserving the separately scoped subtotal",()=>{
 const d=fixture();d.calculation!.grossPay=2300000;d.calculation!.calculatedSubtotal=2000000;
 render(<ResultSummary value={toResultsViewModel(d)}/>);
 const summary=screen.getByRole("region",{name:"임금 결과 요약"});
 const terms=within(summary).getAllByRole("term");
 expect(terms.map(t=>t.textContent)).toEqual(["확정 가능한 범위의 세전 총액","계산 가능한 부분 소계 · 전체 임금 아님"]);
 expect(terms[0].parentElement).toHaveTextContent("2,300,000 원");
 expect(terms[1].parentElement).toHaveTextContent("2,000,000 원");
 expect(within(summary).queryByText(/계산할 정보가/)).not.toBeInTheDocument();
});

it("emphasizes only the available subtotal and never substitutes it for a missing gross amount",()=>{
 const d=fixture();d.calculation!.grossPay=null;d.calculation!.calculatedSubtotal=2000000;
 d.summary.calculationStatus="PARTIAL";
 render(<ResultSummary value={toResultsViewModel(d)}/>);
 const terms=screen.getAllByRole("term");
 expect(terms[0]).toHaveTextContent("계산 가능한 부분 소계 · 전체 임금 아님");
 expect(terms[0].parentElement).toHaveTextContent("2,000,000 원");
 expect(terms[1].parentElement).toHaveTextContent("미확정·확정 불가");
 expect(screen.getByText(/부분 계산은 전체 임금이 아니에요/)).toBeVisible();
});

it.each(["grossPay","calculatedSubtotal"] as const)("treats an explicit zero %s as an available server amount",key=>{
 const d=fixture();d.calculation!.grossPay=null;d.calculation!.calculatedSubtotal=null;d.calculation![key]=0;
 render(<ResultSummary value={toResultsViewModel(d)}/>);
 expect(screen.getByText("0 원")).toBeVisible();
 expect(screen.queryByText(/계산할 정보가/)).not.toBeInTheDocument();
 const term=screen.getAllByRole("term")[0];
 expect(term).toHaveTextContent(key==="grossPay"?"확정 가능한 범위의 세전 총액":"계산 가능한 부분 소계 · 전체 임금 아님");
 expect(term.parentElement).toHaveTextContent("0 원");
 expect(screen.getByText("미확정·확정 불가")).toBeVisible();
});

it("distinguishes null amounts from an entirely absent calculation",()=>{
 const d=fixture();const view=render(<ResultSummary value={toResultsViewModel(d)}/>);
 expect(screen.getByText(/계산할 정보가/)).toBeVisible();
 expect(screen.getAllByText("미확정·확정 불가")).toHaveLength(2);
 expect(screen.queryByText("0 원")).not.toBeInTheDocument();
 expect(screen.queryByText(/부분 계산은 전체 임금/)).not.toBeInTheDocument();
 d.calculation=null;view.rerender(<ResultSummary value={toResultsViewModel(d)}/>);
 expect(screen.getAllByText("미제공")).toHaveLength(2);
 expect(screen.queryByText("0 원")).not.toBeInTheDocument();
 expect(screen.queryByText(/부분 계산은 전체 임금/)).not.toBeInTheDocument();
});

it("does not present a cached CURRENT payload as verified current after a refetch failure",()=>{
 const d=fixture();render(<ResultSummary value={{...toResultsViewModel(d),title:"직전 조회 결과 · 최신성 미확인"}}/>);
 expect(screen.getByRole("status")).toHaveTextContent("직전 조회 결과 · 최신성 미확인");
 expect(screen.getByRole("status")).toHaveAttribute("data-current","false");
 expect(screen.queryByText("현재 입력 기준")).not.toBeInTheDocument();
});

it("keeps compare mode focused on comparison state without wage totals",()=>{
 const d=fixture();d.calculation!.grossPay=2300000;d.calculation!.calculatedSubtotal=2000000;
 render(<ResultSummary compare value={toResultsViewModel(d)}/>);
 expect(screen.getByText("? 정보 부족")).toBeVisible();
 expect(screen.getByText(/계약·근태·명세서 대조와 명세서 내부 합계는 각각/)).toBeVisible();
 expect(screen.queryByRole("term")).not.toBeInTheDocument();
 expect(screen.queryByText("2,300,000 원")).not.toBeInTheDocument();
});

it("links incomplete results to this case's conditions and original review",()=>{
 render(<ResultNextSteps caseId={16} value={toResultsViewModel(fixture())}/>);
 expect(screen.getByRole("link",{name:"계산 조건 확인하기"})).toHaveAttribute("href","/cases/16/conditions");
 expect(screen.getByRole("link",{name:"원문·추출값 확인"})).toHaveAttribute("href","/cases/16/review");
});

it("offers question and company inquiry preparation when inputs no longer require review",()=>{
 const d=fixture();d.summary.calculationStatus="COMPLETE";d.summary.counts={match:2,difference:1,insufficientInformation:0,reviewRequired:0};
 render(<ResultNextSteps caseId={16} value={toResultsViewModel(d)}/>);
 expect(screen.getByRole("link",{name:"확인 질문 보기"})).toHaveAttribute("href","/cases/16/questions");
 expect(screen.getByRole("link",{name:"회사 문의 초안 보기"})).toHaveAttribute("href","/cases/16/company-inquiry");
});

