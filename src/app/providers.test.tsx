// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAppServices } from "@/lib/app-services";
import { AppProviders } from "./providers";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/lib/app-services", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  return {
    createAppServices: vi.fn(() => ({
      queryClient: new QueryClient(),
      auth: { restore: vi.fn().mockResolvedValue(undefined) },
    })),
  };
});

beforeEach(() => { vi.clearAllMocks(); route.pathname = "/"; });
afterEach(cleanup);

it("restores the landing session once so the logo has a resolved destination", () => {
  render(<AppProviders><h1>Public landing</h1></AppProviders>);
  expect(screen.getByRole("heading", { name: "Public landing" })).toBeVisible();
  expect(createAppServices).toHaveBeenCalledTimes(1);
  expect(vi.mocked(createAppServices).mock.results[0].value.auth.restore).toHaveBeenCalledTimes(1);
});

it("initializes the existing services when navigating to auth and retains them between auth routes", () => {
  const { rerender } = render(<AppProviders><p>Route content</p></AppProviders>);
  route.pathname = "/login";
  rerender(<AppProviders><p>Login form</p></AppProviders>);
  expect(screen.getByText("Login form")).toBeVisible();
  expect(createAppServices).toHaveBeenCalledTimes(1);
  const services = vi.mocked(createAppServices).mock.results[0].value;
  expect(services.auth.restore).toHaveBeenCalledTimes(1);
  route.pathname = "/signup";
  rerender(<AppProviders><p>Signup form</p></AppProviders>);
  expect(createAppServices).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Signup form")).toBeVisible();
});
