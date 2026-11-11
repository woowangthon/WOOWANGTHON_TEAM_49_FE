// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { CaseListDto } from "@/features/cases/schemas";
import { WorkflowProgress } from "./workflow-progress";
afterEach(cleanup);
it.each(["UPLOAD", "REVIEW", "CONDITIONS", "COMPARE", "RESULT", undefined] as const)("shows only the actual position %s without completion claims", currentStep => {
 render(<WorkflowProgress item={{caseId:15,currentStep} as CaseListDto}/>);
 const links=screen.getAllByRole("link");
 expect(links.map(l=>l.getAttribute("href"))).toEqual(["upload","review","conditions","compare","result"].map(p=>`/cases/15/${p}`));
 expect(links.filter(l=>l.getAttribute("aria-current")==="step")).toHaveLength(currentStep?1:0);
 expect(screen.queryByRole("progressbar")).toBeNull();
 expect(screen.queryByText(/완료|%|✓/)).toBeNull();
 if(!currentStep)expect(screen.getByText("현재 단계 정보 미제공")).toBeVisible();
});
