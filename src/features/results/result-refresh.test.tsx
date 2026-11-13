// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {ResultRefresh} from "./result-refresh";
import {ResultReasons,resultReasonCodes} from "./result-reasons";
import {createTranslation} from "@/i18n/translate";
const {translate:t}=createTranslation("ko");
import {resultsSchema,resultsView} from "./schemas";
import {buildResultScenario} from "@/mocks/shared/result-scenario";
import type {CaseDetailDto} from "@/features/cases/schemas";
const mocks=vi.hoisted(()=>({context:vi.fn(),status:vi.fn(),action:vi.fn(),execute:vi.fn()}));
vi.mock("@/features/cases/queries",()=>({useCase:mocks.context}));
vi.mock("@/features/documents/queries",()=>({useRecomputeStatus:mocks.status}));
vi.mock("./queries",()=>({useResultExecution:mocks.action}));
const data=(freshness:string)=>{
 const scenario=buildResultScenario({caseId:15,inputVersion:63,periodStart:"2026-01-01",periodEnd:"2026-01-31"} as CaseDetailDto,20,[],[],[]);
 return resultsView(resultsSchema.parse({...scenario,freshness:{overall:freshness},versions:{...scenario.versions,calculation:{...scenario.versions.calculation,freshness:"CURRENT"},comparison:{...scenario.versions.comparison,freshness:"STALE"}}}));
};
beforeEach(()=>{
 vi.clearAllMocks();mocks.context.mockReturnValue({data:{inputVersion:64}});
 mocks.status.mockReturnValue({data:{activeJob:null,pending:0,running:0,results:{}}});
 mocks.execute.mockResolvedValue({jobId:"a",status:"PENDING"});mocks.action.mockReturnValue({mutateAsync:mocks.execute});
});
afterEach(cleanup);
it.each(["STALE","FAILED"])("requests latest Case version for %s and locks double clicks",freshness=>{
 render(<ResultRefresh caseId={15} data={data(freshness)}/>);
 const button=screen.getByRole("button",{name:t("results.refreshLatest")});fireEvent.click(button);fireEvent.click(button);
 expect(mocks.execute).toHaveBeenCalledExactlyOnceWith({endpoint:"recompute",version:64});
});
it("does not compare inputVersion and resultVersion for CURRENT",()=>{
 render(<ResultRefresh caseId={15} data={data("CURRENT")}/>);expect(screen.queryByRole("button")).not.toBeInTheDocument();
 expect(screen.getByText(`${t("results.checkComparison")}: ${t("results.viewModels_result")}`)).toBeVisible();
});
it.each(["PENDING","RUNNING"])("blocks another execution while %s",status=>{
 mocks.status.mockReturnValue({data:{activeJob:{status},results:{}}});render(<ResultRefresh caseId={15} data={data("STALE")}/>);
 const button=screen.getByRole("button",{name:t("results.recalculating")});expect(button).toBeDisabled();fireEvent.click(button);expect(mocks.execute).not.toHaveBeenCalled();
});
it("shows mutation failure with retry available",()=>{
 mocks.action.mockReturnValue({mutateAsync:mocks.execute,isError:true,error:new Error("failure")});
 render(<ResultRefresh caseId={15} data={data("FAILED")}/>);expect(screen.getByRole("button",{name:t("results.refreshLatest")})).toBeEnabled();expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
});
it("deduplicates only supplied reasons and routes scope and payment actions",()=>{
 const value={reasonCodes:["ITEM_SCOPE_INCOMPLETE","DUPLICATE_TRANSACTION","FUTURE_REASON"],nested:{reasonCode:"DUPLICATE_TRANSACTION"}};
 expect(resultReasonCodes(value)).toHaveLength(3);expect(resultReasonCodes({status:"INSUFFICIENT_INFORMATION"})).toEqual([]);
 render(<ResultReasons caseId={15} data={value}/>);expect(screen.getByRole("link",{name:t("results.reasonItemScope")})).toHaveAttribute("href","/cases/15/review");expect(screen.getByRole("link",{name:t("results.reasonDuplicate")})).toHaveAttribute("href","/cases/15/result#payment-management");expect(screen.getByText("(FUTURE_REASON)")).toBeVisible();
});
