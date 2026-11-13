// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CaseWorkspace } from "./case-workspace";
let pathname = "/cases/15/questions";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("./case-context", () => ({
 CaseContext: ({ showStep }: { showStep: boolean }) => <div>case context {showStep && "current step"}</div>,
 TaskNavigation: () => <nav aria-label="task navigation" />,
}));
vi.mock("@/features/chats/case-chat", () => ({ CaseChat: () => <div>chat</div> }));
afterEach(cleanup);
it.each(["questions", "company-inquiry", "reports"])("preserves context and hides task navigation and current step for %s", path => {
 pathname = `/cases/15/${path}`;
 render(<CaseWorkspace id={15}><div>support screen</div></CaseWorkspace>);
 expect(screen.queryByRole("navigation")).toBeNull();
 expect(screen.getByText("case context")).toBeTruthy();
 expect(screen.queryByText(/current step/)).toBeNull();
 expect(screen.getByText("support screen")).toBeTruthy();
});
it("keeps the task navigation and current step for normal case work", () => {
 pathname = "/cases/15/upload";
 render(<CaseWorkspace id={15}><div>upload</div></CaseWorkspace>);
 expect(screen.getByRole("navigation", { name: "task navigation" })).toBeTruthy();
 expect(screen.getByText(/current step/)).toBeTruthy();
});
