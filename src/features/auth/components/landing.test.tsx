// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Landing } from "./landing";
vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: () => ({status: "anonymous"}) }));

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps existing auth routes and switches all four illustrative previews", async () => {
  const user = userEvent.setup();
  render(<Landing />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("자료는 한곳에.");
  expect(screen.getByRole("link", { name: "내 월급 확인하기" })).toHaveAttribute("href", "/login");
  expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute("href", "/signup");
  expect(screen.getByRole("link", { name: "월급잇다 시작하기" })).toHaveAttribute("href", "/signup");
  for (const [label, heading] of [
    ["원문 확인", "원문과 나란히 확인해요."],
    ["임금 계산", "받아야 할 임금을 살펴봐요."],
    ["명세서·입금 대조", "입금까지 이어서 확인해요."],
    ["자료 모으기", "내 월급의 기록을 모아요."],
  ]) {
    const button = screen.getByRole("button", { name: new RegExp(label) });
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    const preview = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(preview).toHaveAttribute("aria-live", "polite");
    expect(within(preview).getByRole("heading", { level: 3 })).toHaveTextContent(heading);
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
  }
  expect(screen.getByText(/AI 답변은 참고용/)).toBeVisible();
  expect(screen.getByText(/이 페이지의 문서와 금액은/)).toBeVisible();
});

it("closes mobile navigation on Escape with focus restored and on anchor selection", async () => {
  const user = userEvent.setup();
  render(<Landing />);
  const toggle = screen.getByRole("button", { name: "메뉴 열기" });
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveAttribute("aria-label", "주 메뉴");
  await user.keyboard("{Escape}");
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle).toHaveFocus();
  await user.click(toggle);
  await user.click(screen.getByRole("link", { name: "이용 방법" }));
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("link", { name: "이용 방법" })).toHaveAttribute("href", "#how-it-works");
});

it("keeps the native FAQ disclosures operable", async () => {
  const user = userEvent.setup();
  render(<Landing />);
  const summary = screen.getByText("차이가 나오면 바로 미지급액인가요?");
  expect(summary.tagName).toBe("SUMMARY");
  await user.click(summary);
  expect(summary.closest("details")).toHaveAttribute("open");
  expect(screen.getByText(/아니요. 현재 확인한 자료의 값이 다르다는 뜻/)).toBeVisible();
  await user.click(summary);
  expect(summary.closest("details")).not.toHaveAttribute("open");
});

it("copies the displayed example and announces success", async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(<Landing />);
  await user.click(screen.getByRole("button", { name: "예시 문장 복사" }));
  expect(write).toHaveBeenCalledWith(screen.getByText(/^6월 급여명세서의 실수령액은/).textContent);
  expect(screen.getByRole("status")).toHaveTextContent("예시 문장을 복사했어요.");
});

it("offers manual copying and focuses the example when clipboard access fails", async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard unavailable"));
  render(<Landing />);
  await user.click(screen.getByRole("button", { name: "예시 문장 복사" }));
  expect(screen.getByRole("status")).toHaveTextContent("문장을 직접 선택해서 복사해 주세요.");
  expect(screen.getByText(/^6월 급여명세서의 실수령액은/)).toHaveFocus();
});
