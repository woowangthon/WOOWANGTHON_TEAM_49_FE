// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { ResultExplorer, resultGroups } from "./result-explorer";
import { ResultCarousel } from "@/components/ui/result-carousel";
import { buildResultScenario } from "@/mocks/shared/result-scenario";
import type { CaseDetailDto } from "@/features/cases/schemas";
const fixture = () => buildResultScenario({caseId:15,inputVersion:7,periodStart:"2026-01-01",periodEnd:"2026-01-31"} as CaseDetailDto,2,[],[],[]);
afterEach(cleanup);
it("groups actual response sections without inferring titles or altering values", () => {
 const data = fixture(); const original = structuredClone(data);
 const groups = resultGroups(data, false);
 expect(groups.map(g=>g.id)).toEqual(["calculation","comparison","validation","deposit"]);
 expect(groups[0].cards[0].data).toBe(data.calculation!.items[0]);
 expect(groups[2].cards.map(c=>c.id)).toEqual(["paymentTotal","deductionTotal","netPay"]);
 expect(data).toEqual(original);
});
it("preserves tab position, filter and selected item when switching categories or refreshing", async () => {
 const u=userEvent.setup(); const data=fixture();
 const view=render(<ResultExplorer data={data} compare/>);
 await u.click(screen.getByRole("tab",{name:"명세서 내부 합계 검사"}));
 expect(screen.getByRole("button",{name:"이전 카드"})).toBeDisabled();
 await u.click(screen.getByRole("button",{name:"다음 카드"}));
 expect(screen.getByRole("heading",{name:"공제 합계"})).toBeVisible();
 await u.click(screen.getByRole("tab",{name:"입금 대조"}));
 expect(screen.getByText(/해당 조건의 결과가 없습니다/)).toBeVisible();
 await u.click(screen.getByRole("tab",{name:"명세서 내부 합계 검사"}));
 expect(screen.getByRole("heading",{name:"공제 합계"})).toBeVisible();
 view.rerender(<ResultExplorer data={structuredClone(data)} compare/>);
 expect(screen.getByRole("heading",{name:"공제 합계"})).toBeVisible();
 const filters=screen.getByRole("group",{name:"검사 상태 필터"});
 await u.click(within(filters).getByRole("button",{name:/정보 부족/}));
 await u.click(screen.getByRole("button",{name:"다음 카드"}));
 await u.click(screen.getByRole("tab",{name:"입금 대조"}));
 await u.click(screen.getByRole("tab",{name:"명세서 내부 합계 검사"}));
 expect(within(filters).getByRole("button",{name:/정보 부족/})).toHaveAttribute("aria-pressed","true");
 expect(screen.getByText("2 / 3")).toBeVisible();
});
it("keeps independent statuses, zero and null, and warning shortcuts visible outside tabs", async()=>{
 const u=userEvent.setup(),d=fixture();
 d.payslipValidation!.paymentTotal={status:"MATCH",difference:0};
 d.payslipValidation!.deductionTotal={status:"DIFFERENCE",difference:100};
 d.payslipValidation!.netPay={status:"REVIEW_REQUIRED",difference:null};
 render(<ResultExplorer data={d} compare/>);
 await u.click(screen.getByRole("button",{name:/차이 \d+개/}));
 expect(screen.getByRole("heading",{name:"공제 합계"})).toBeVisible();
 expect(within(screen.getByRole("tabpanel")).getByText("100 원")).toBeVisible();
 expect(screen.queryByRole("button",{name:"다음 카드"})).not.toBeInTheDocument();
 await u.click(screen.getByRole("tab",{name:"명세서 내부 합계 검사"}));
 await u.click(within(screen.getByRole("group",{name:"검사 상태 필터"})).getByRole("button",{name:/전체/}));
 expect(within(screen.getByRole("tabpanel")).getByText("0 원")).toBeVisible();
 const carousel=screen.getByLabelText("명세서 내부 합계 검사 1 / 3");
 fireEvent.keyDown(carousel,{key:"End"});
 expect(screen.getByRole("heading",{name:"실수령액"})).toBeVisible();
 expect(within(screen.getByRole("tabpanel")).getAllByText("미확정·확정 불가").length).toBeGreaterThan(0);
 expect(screen.getByRole("button",{name:"다음 카드"})).toBeDisabled();
 expect(screen.getByRole("button",{name:/차이 \d+개/})).toBeVisible();
});
it("supports tab keyboard navigation and empty results",()=>{
 const d=fixture();d.comparison=null;render(<ResultExplorer data={d} compare/>);
 const tab=screen.getByRole("tab",{name:"계약·근태·명세서 대조"});
 expect(screen.getByText(/해당 조건의 결과가 없습니다/)).toBeVisible();
 fireEvent.keyDown(tab,{key:"End"});
 expect(screen.getByRole("tab",{name:"입금 대조"})).toHaveFocus();
 fireEvent.keyDown(screen.getByRole("tab",{name:"입금 대조"}),{key:"Home"});
 expect(tab).toHaveFocus();
});
it("shows official deposit amounts with units, preserving null and zero",async()=>{
 const d=fixture(),u=userEvent.setup();d.depositComparison={status:"REVIEW_REQUIRED",payslipNetPay:null,linkedPaymentTotal:0,difference:null,version:2};
 render(<ResultExplorer data={d} compare/>);
 await u.click(screen.getByRole("tab",{name:"입금 대조"}));
 expect(within(screen.getByRole("tabpanel")).getByText("0 원")).toBeVisible();
 expect(within(screen.getByRole("tabpanel")).getAllByText("미확정·확정 불가").length).toBeGreaterThan(0);
 expect(screen.queryByRole("button",{name:"다음 카드"})).not.toBeInTheDocument();
});
it("shows and focuses integrated evidence only when a global shortcut has no matching check card", async()=>{
 const d=fixture(),u=userEvent.setup();
 d.summary.counts.difference=12;
 d.items[0].status="DIFFERENCE";
 render(<ResultExplorer data={d} compare/>);
 expect(screen.queryByRole("region",{name:"추가 근거 확인"})).not.toBeInTheDocument();
 await u.click(screen.getByRole("button",{name:"차이 12개 · 확인"}));
 const evidence=await screen.findByRole("region",{name:"추가 근거 확인"});
 expect(within(evidence).getByText(/차이 항목을 확인합니다/)).toBeVisible();
 await waitFor(()=>expect(evidence).toHaveFocus());
 expect(within(evidence).getByRole("heading",{level:3,name:/시급 대응 항목/})).toBeVisible();
 expect(evidence.querySelector("details")).not.toBeInTheDocument();
 await u.click(screen.getByRole("tab",{name:"명세서 내부 합계 검사"}));
 expect(screen.queryByRole("region",{name:"추가 근거 확인"})).not.toBeInTheDocument();
});
it("keeps zero summary counts explicit and explains absent detail without creating a result",async()=>{
 const d=fixture(),u=userEvent.setup();
 d.summary.counts={match:0,difference:0,insufficientInformation:0,reviewRequired:0};
 d.calculation=null;d.comparison=null;d.payslipValidation=null;d.depositComparison=null;d.items=[];
 render(<ResultExplorer data={d} compare={false}/>);
 const overview=screen.getByRole("complementary",{name:"중요한 결과 안내"});
 for(const name of ["차이 0개 · 확인","정보 부족 0개 · 확인","검토 필요 0개 · 확인"]){
  expect(within(overview).getByRole("button",{name})).toBeEnabled();
 }
 expect(within(overview).getByText("자료상 일치").parentElement).toHaveTextContent("0개");
 await u.click(within(overview).getByRole("button",{name:"차이 0개 · 확인"}));
 await waitFor(()=>expect(screen.getByText(/차이 항목을 확인합니다/)).toBeVisible());
 expect(screen.getByText(/해당 조건의 결과가 없습니다/)).toBeVisible();
 expect(screen.queryByText("0 원")).not.toBeInTheDocument();
});
it("keeps server overview counts separate from counts for the selected response section",async()=>{
 const d=fixture(),u=userEvent.setup();
 d.summary.counts={match:9,difference:7,insufficientInformation:19,reviewRequired:4};
 render(<ResultExplorer data={d} compare={false}/>);
 const overview=screen.getByRole("complementary",{name:"중요한 결과 안내"});
 expect(within(overview).getByRole("button",{name:"정보 부족 19개 · 확인"})).toBeVisible();
 expect(within(overview).getByText("자료상 일치").parentElement).toHaveTextContent("9개");
 await u.click(screen.getByRole("tab",{name:"명세서 내부 합계 검사"}));
 const filters=screen.getByRole("group",{name:"검사 상태 필터"});
 expect(within(filters).getByRole("button",{name:"전체 (3)"})).toBeVisible();
 expect(within(filters).getByRole("button",{name:"정보 부족 (3)"})).toBeVisible();
 expect(within(overview).getByRole("button",{name:"정보 부족 19개 · 확인"})).toBeVisible();
 expect(within(overview).getByText(/아래 필터 건수는 현재 응답의 선택 검사 범위/)).toBeVisible();
});
it("keeps raw reason codes within the supporting detail disclosure",async()=>{
 const d=fixture(),u=userEvent.setup();
 render(<ResultExplorer data={d} compare={false}/>);
 await u.click(screen.getByRole("button",{name:"다음 카드"}));
 const code=screen.getByText("UNVERIFIED_STATUTORY_RULES");
 expect(code).not.toBeVisible();
 await u.click(screen.getByText("계산식·비교 기준·출처·버전 상세"));
 expect(code).toBeVisible();
});
it("opens selected evidence from comparison table",async()=>{
 const d=fixture(),u=userEvent.setup();
 render(<ResultExplorer data={d} compare={false}/>);
 await u.click(screen.getByRole("tab",{name:"명세서 내부 합계 검사"}));
 await u.click(within(screen.getByRole("group",{name:"검사 상태 필터"})).getByRole("button",{name:"일치 (0)"}));
 await u.click(screen.getByRole("tab",{name:"임금 계산 항목"}));
 await u.click(screen.getByRole("button",{name:/공제 합계.*근거 보기/}));
 expect(screen.getByRole("tab",{name:"명세서 내부 합계 검사"})).toHaveAttribute("aria-selected","true");
 const panel=screen.getByRole("tabpanel");
 expect(within(panel).getByRole("heading",{name:"공제 합계"})).toBeVisible();
 expect(within(panel).getByRole("button",{name:"전체 (3)"})).toHaveAttribute("aria-pressed","true");
 const summary=within(panel).getByText("계산식·비교 기준·출처·버전 상세");
 await waitFor(()=>expect(summary.closest("details")).toHaveAttribute("open"));
 expect(summary).toHaveFocus();
});
it("marks cached freshness unverified without changing the server freshness or versions",()=>{
 const d=fixture();
 d.freshness.overall="CURRENT";
 render(<ResultExplorer data={d} compare={false} freshnessUnverified/>);
 const overview=screen.getByRole("complementary",{name:"중요한 결과 안내"});
 expect(within(overview).getByText(`최신성 미확인 · 현재 입력 v${d.currentInputVersion} · 결과 v${d.resultVersion}`)).toBeVisible();
 expect(within(overview).queryByText(/^최신 ·/)).not.toBeInTheDocument();
 expect(d.freshness.overall).toBe("CURRENT");
});
it("subdues only zero-count shortcuts while keeping every count actionable",()=>{
 const d=fixture();
 d.summary.counts={match:1,difference:0,insufficientInformation:3,reviewRequired:0};
 render(<ResultExplorer data={d} compare={false}/>);
 const difference=screen.getByRole("button",{name:"차이 0개 · 확인"});
 const insufficient=screen.getByRole("button",{name:"정보 부족 3개 · 확인"});
 const review=screen.getByRole("button",{name:"검토 필요 0개 · 확인"});
 expect(difference).toHaveAttribute("data-empty","true");
 expect(insufficient).toHaveAttribute("data-empty","false");
 expect(review).toHaveAttribute("data-empty","true");
 for(const button of [difference,insufficient,review])expect(button).toBeEnabled();
});
it.each([0,1,3])("carousel handles %s results without looping",count=>{
 let current=0;const change=(n:number)=>{current=n;};
 const v=render(<ResultCarousel count={count} index={0} onIndexChange={change} title="검사"><p>현재 카드</p></ResultCarousel>);
 if(count<2){expect(screen.queryByRole("button")).not.toBeInTheDocument();return;}
 expect(screen.getByRole("button",{name:"이전 카드"})).toBeDisabled();
 fireEvent.keyDown(screen.getByLabelText("검사 1 / 3"),{key:"End"});expect(current).toBe(2);
 v.rerender(<ResultCarousel count={count} index={current} onIndexChange={change} title="검사"><p>마지막</p></ResultCarousel>);
 expect(screen.getByRole("button",{name:"다음 카드"})).toBeDisabled();
 fireEvent.touchStart(screen.getByLabelText("검사 3 / 3"),{touches:[{clientX:200,clientY:30}]});
 fireEvent.touchEnd(screen.getByLabelText("검사 3 / 3"),{changedTouches:[{clientX:300,clientY:32}]});expect(current).toBe(1);
});
