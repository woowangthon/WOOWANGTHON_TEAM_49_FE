// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BrandLink } from "./brand-link";
const auth = vi.hoisted(() => ({status: "restoring"}));
vi.mock("@/features/auth/hooks/use-auth", () => ({useAuth: () => auth}));
afterEach(cleanup);
it.each(["anonymous", "authenticated", "restoring", "signing-out"])("resolves logo for %s without guessing pending authentication", status => {
  auth.status = status; render(<BrandLink>월급잇다</BrandLink>);
  const link = screen.getByRole("link");
  expect(link).toHaveAttribute("href", status === "authenticated" ? "/dashboard" : "/");
  const pending = ["restoring", "signing-out"].includes(status);
  expect(link.getAttribute("aria-disabled")).toBe(pending ? "true" : null);
  if (pending) expect(fireEvent.click(link)).toBe(false);
});
