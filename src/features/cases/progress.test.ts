import { describe, expect, it } from "vitest";
import { caseProgress } from "./progress";
import type { CaseListDto } from "./schemas";
import type { Condition, Conditions } from "@/features/case-inputs/schemas";
import type { DocumentDto } from "@/features/documents/schemas";
const dto = {caseId:15, inputVersion:3, documentCount:1, currentStep:"UPLOAD", latestCalculationId:null} as CaseListDto;
const answered = {conditionId:"base_scope_confirmed", requiredFor:["WAGE_CALCULATION"], status:"ANSWERED", value:true} as Condition;
const conditions = (items: Condition[] = [answered]): Conditions => ({inputVersion:3, conditions:items});
const docs = (reviewStatus = "CONFIRMED", processingStatus = "REVIEW_REQUIRED") => ({total:1, items:[{reviewStatus, processingStatus} as DocumentDto]});
describe("saved input progress", () => {
 it("starts without documents or manual records without claiming review completion", () => {
  const progress = caseProgress({...dto,documentCount:0}, conditions(), {items:[],total:0},0);
  expect(progress.next).toBe("UPLOAD");
  expect(progress.reviewComplete).toBeUndefined();
 });
 it("requires document review independently of processing status", () => {
  expect(caseProgress(dto,conditions(),docs("NOT_STARTED","READY"),0).next).toBe("REVIEW");
  expect(caseProgress(dto,conditions(),docs(),0).next).toBe("RESULT");
 });
 it("requires saved confirmation even with a candidate value", () => expect(caseProgress(dto,conditions([{...answered,status:"REQUIRED"}]),docs(),0).next).toBe("CONDITIONS"));
 it.each([false,0,"UNKNOWN"])("preserves saved %s answers without requiring complete calculation results", value => expect(caseProgress(dto,conditions([{...answered,value,status:value==="UNKNOWN"?"UNKNOWN":"ANSWERED"}]),docs(),0).conditionsComplete).toBe(true));
 it("ignores deposit-only requirements", () => expect(caseProgress(dto,conditions([answered,{...answered,conditionId:"deposit",requiredFor:["DEPOSIT_COMPARISON"],status:"REQUIRED",value:null}]),docs(),0).next).toBe("RESULT"));
 it("does not infer completion from a previous input version or missing pages", () => {
  expect(caseProgress(dto,{...conditions(),inputVersion:2},docs(),0).conditionsComplete).toBeUndefined();
  expect(caseProgress(dto,conditions(),{items:[],total:1},0).reviewComplete).toBeUndefined();
 });
 it("allows manual-only input and reevaluates newly required conditions", () => {
  expect(caseProgress({...dto,documentCount:0},conditions(),{items:[],total:0},1).next).toBe("RESULT");
  expect(caseProgress(dto,conditions([{...answered,status:"REQUIRED",value:null}]),docs(),0).next).toBe("CONDITIONS");
 });
});
