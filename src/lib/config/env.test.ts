import { describe, expect, it } from "vitest";

import { parseApiBaseUrl } from "./env";

describe("API Base URL", () => {
  it("normalizes trailing slashes while preserving the version prefix", () => {
    expect(parseApiBaseUrl("http://127.0.0.1:8000/api/v1///")).toBe("http://127.0.0.1:8000/api/v1");
  });

  it.each(["/api/v1", "file:///private", "https://user:password@example.com/api/v1", "https://example.com/api/v1?token=x", "https://example.com/api/v1#x"]) (
    "rejects invalid or credential-bearing configuration: %s", (url) => {
      expect(() => parseApiBaseUrl(url)).toThrow();
    },
  );
});
