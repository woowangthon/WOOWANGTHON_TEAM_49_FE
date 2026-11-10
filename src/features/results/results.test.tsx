// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ServerValue } from "./result-screen";
afterEach(cleanup);
describe("server results",()=>{
 it("preserves null and explicit zero",()=>{render(<ServerValue caseId={15} value={{grossPay:null,calculatedSubtotal:0}}/>);expect(screen.getByText("미제공·확정 불가")).toBeInTheDocument();expect(screen.getByText("0")).toBeInTheDocument();});
 it.each(["COMPLETE","PARTIAL","REVIEW_REQUIRED","CURRENT","STALE","UPDATING","FAILED"])("renders %s",status=>{const {container}=render(<ServerValue caseId={15} value={status}/>);expect(container.textContent).not.toBe(status);});
 it("keeps three checks independent",()=>{render(<ServerValue caseId={15} value={{paymentTotal:{status:"MATCH",difference:0},deductionTotal:{status:"INSUFFICIENT_INFORMATION",difference:null},netPay:{status:"DIFFERENCE",difference:10000}}}/>);expect(screen.getByText("✓ 자료상 일치")).toBeInTheDocument();expect(screen.getByText("? 정보 부족")).toBeInTheDocument();expect(screen.getByText(/미지급임금 확정이 아닙니다/)).toBeInTheDocument();});
 it("links source and preserves mismatch",()=>{render(<ServerValue caseId={15} value={{comparisonBasis:{semanticMatch:false},sources:[{documentId:101,page:2,text:"원문 근거"}]}}/>);expect(screen.getByRole("link")).toHaveAttribute("href","/cases/15/review?documentId=101");expect(screen.getByText("아니요")).toBeInTheDocument();expect(screen.getByText("원문 근거")).toBeInTheDocument();});
});
