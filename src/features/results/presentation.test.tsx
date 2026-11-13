import {createTranslation} from '@/i18n/translate';
﻿// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { buildResultScenario } from "@/mocks/shared/result-scenario";
import {createLocalizedFeaturesResultsViewModels} from './view-models';
import { ResultSummary, ResultItem, ResultChecks } from "./result-presentation";
import type { CaseDetailDto } from "@/features/cases/schemas";

const {toResultsViewModel} = createLocalizedFeaturesResultsViewModels(createTranslation('ko'));
afterEach(cleanup);
function fixture(){return buildResultScenario({caseId:15,inputVersion:7,periodStart:"2026-01-01",periodEnd:"2026-01-31"} as CaseDetailDto,2,[],[],[]);}
it("retains every DTO field and item reference including future evidence fields",()=>{const d=fixture();d.items[0].extraEvidence={reason:"kept"};const vm=toResultsViewModel(d);expect(vm.dto).toBe(d);expect(vm.items.map(i=>i.dto)).toEqual(d.items);expect(vm.items[0].dto.extraEvidence).toEqual({reason:"kept"});});
it.each(["CURRENT","STALE","UPDATING","FAILED"] as const)("shows freshness %s and partial scope",freshness=>{const d=fixture();d.freshness.overall=freshness;d.calculation!.status="PARTIAL";d.summary.calculationStatus="PARTIAL";render(<ResultSummary value={toResultsViewModel(d)}/>);expect(screen.getByRole("status").textContent).toMatch(freshness==="CURRENT"?/현재 입력/:/이전 입력/);expect(screen.getByText("부분 계산")).toBeVisible();});
it("shows zero separately from null with units and keeps evidence in disclosure",()=>{const d=fixture();d.items[0].calculatedValue=0;d.items[0].documentValue=null;render(<ResultItem caseId={15} item={toResultsViewModel(d).items[0]}/>);expect(screen.getAllByText("0 원/시간")[0]).toBeVisible();expect(screen.getAllByText("미확정·확정 불가").length).toBeGreaterThan(0);expect(screen.getByText("근거·계산식·검토 사유 펼치기").closest("details")).not.toHaveAttribute("open");});
it("keeps independent statuses and values without synthesizing a total status",()=>{const d=fixture();d.payslipValidation!.paymentTotal.status="MATCH";d.payslipValidation!.deductionTotal.status="DIFFERENCE";d.payslipValidation!.netPay.status="REVIEW_REQUIRED";render(<ResultChecks caseId={15} value={toResultsViewModel(d)}/>);expect(screen.getByText("✓ 자료상 일치")).toBeVisible();expect(screen.getByText(/△ 차이 발견/)).toBeVisible();expect(screen.getByText("검토 필요")).toBeVisible();});
