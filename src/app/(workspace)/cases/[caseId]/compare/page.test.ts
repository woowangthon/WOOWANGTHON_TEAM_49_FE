import { describe, expect, it, vi } from "vitest";
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
  notFound: vi.fn(() => { throw new Error("not-found"); }),
}));
vi.mock("next/navigation", () => navigation);
import Page from "./page";

describe("legacy comparison route", () => {
  it("redirects to unified results while preserving snapshot and return parameters", async () => {
    await expect(Page({ params: Promise.resolve({ caseId: "15" }), searchParams: Promise.resolve({ snapshotKind: "calculation", snapshotId: "12", snapshotVersion: "3", returnTo: "/workplaces/3/chats/7", filter: ["a", "b"] }) })).rejects.toThrow("redirect:");
    const url = new URL(navigation.redirect.mock.calls.at(-1)![0], "https://example.test");
    expect(url.pathname).toBe("/cases/15/result");
    expect(url.searchParams.get("snapshotId")).toBe("12");
    expect(url.searchParams.get("snapshotVersion")).toBe("3");
    expect(url.searchParams.get("returnTo")).toBe("/workplaces/3/chats/7");
    expect(url.searchParams.getAll("filter")).toEqual(["a", "b"]);
  });
  it("rejects invalid case IDs before redirecting", async () => {
    await expect(Page({ params: Promise.resolve({ caseId: "invalid" }), searchParams: Promise.resolve({}) })).rejects.toThrow("not-found");
  });
});
