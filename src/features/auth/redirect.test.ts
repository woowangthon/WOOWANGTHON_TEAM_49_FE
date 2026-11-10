import { describe, expect, it } from "vitest";

import { loginHref, safeReturnTo } from "./redirect";

describe("validated login return paths", () => {
  it.each(["/consultation-centers?category=WAGE", "/dashboard", "/dashboard?tab=my-cases", "/cases/15/review?documentId=3", "/workplaces/2", "/library", "/settings#profile"]) (
    "preserves an internal workspace destination: %s", (path) => expect(safeReturnTo(path)).toBe(path),
  );

  it.each([
    undefined, null, "", "https://evil.example", "//evil.example", "javascript:alert(1)",
    "/\\evil.example", "/%5cevil.example", "/%2fevil.example", "/%252fevil.example",
    "/cases/../login", "/cases/%2e%2e/login", "/dashboard/%252e%252e/login",
    "/login", "/signup", "/unknown", "/dashboard\n", "/dashboard/%00", "/dashboard/%broken",
  ])("rejects external, ambiguous and recursive auth destinations: %s", (path) => {
    expect(safeReturnTo(path)).toBe("/dashboard");
  });

  it("encodes the destination as one query parameter", () => {
    const url = new URL(loginHref("/cases/15/review?documentId=3&tab=fields", true), "https://wageitda.invalid");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/cases/15/review?documentId=3&tab=fields");
    expect(url.searchParams.get("registered")).toBe("1");
    expect(url.searchParams.has("tab")).toBe(false);
  });
});
