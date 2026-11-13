// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ServerValue } from "./result-screen";
afterEach(cleanup);
describe("server results",()=>{
 it("preserves null and explicit zero",()=>{render(<ServerValue caseId={15} value={{grossPay:null,calculatedSubtotal:0}}/>);expect(screen.getByText("미확정")).toBeInTheDocument();expect(screen.getByText("0 원")).toBeInTheDocument();});
 it.each(["COMPLETE","PARTIAL","REVIEW_REQUIRED","CURRENT","STALE","UPDATING","FAILED"])("renders %s",status=>{const {container}=render(<ServerValue caseId={15} value={status}/>);expect(container.textContent).not.toBe(status);});
 it("keeps three checks independent",()=>{render(<ServerValue caseId={15} value={{paymentTotal:{status:"MATCH",difference:0},deductionTotal:{status:"INSUFFICIENT_INFORMATION",difference:null},netPay:{status:"DIFFERENCE",difference:10000}}}/>);expect(screen.getByText("✓ 자료상 일치")).toBeInTheDocument();expect(screen.getByText("정보 부족")).toBeInTheDocument();expect(screen.getByText(/미지급임금 확정이 아닙니다/)).toBeInTheDocument();});
 it("preserves explicit semantic mismatch without inventing a difference",()=>{render(<ServerValue caseId={15} value={{comparisonBasis:{semanticMatch:false},difference:null}}/>);expect(screen.getByText("아니요")).toBeInTheDocument();expect(screen.getByText("미확정")).toBeInTheDocument();});
});
