// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { Landing } from "./landing";
afterEach(cleanup);
it("offers existing auth routes and interactive previews without personal results", async () => {
 render(<Landing />);
 expect(screen.getByRole("heading", {level:1})).toHaveTextContent("자료는 한곳에.");
 expect(screen.getByRole("link", {name:"내 월급 확인하기"})).toHaveAttribute("href", "/login");
 await userEvent.click(screen.getByRole("button", {name:"03 · 결과 살펴보기"}));
 expect(screen.getByRole("button", {name:"03 · 결과 살펴보기"})).toHaveAttribute("aria-pressed", "true");
 expect(screen.getByText("결과의 기준과 갱신 상태")).toBeVisible();
 await userEvent.click(screen.getByRole("button", {name:"02 · 값 확인하기"}));
 expect(screen.getByText("문서 원문")).toBeVisible();
 expect(screen.getByRole("button", {name:"03 · 결과 살펴보기"})).toHaveAttribute("aria-pressed", "false");
 expect(document.getElementById(screen.getByRole("button", {name:"02 · 값 확인하기"}).getAttribute("aria-controls")!)).toHaveAttribute("aria-live", "polite");
 await userEvent.click(screen.getByRole("button", {name:"01 · 자료 모으기"}));
 expect(screen.getAllByText("급여명세서", {selector:"strong"})).toHaveLength(2);
 expect(screen.getByText(/AI 답변은 참고용/)).toBeVisible();
});

