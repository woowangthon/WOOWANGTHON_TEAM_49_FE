// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { downloadFilename, saveDownload } from "./download";
import { createApiClient } from "./client";
import { createMemorySession } from "@/features/auth/session";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it.each([
  [null, "report.pdf"],
  ['attachment; filename="ascii report.pdf"', "ascii report.pdf"],
  ["attachment; filename=old.pdf; filename*=UTF-8''%ED%95%9C%EA%B8%80%20%EB%B3%B4%EA%B3%A0%EC%84%9C.pdf", "한글 보고서.pdf"],
  ['attachment; filename="semi; colon.pdf"', "semi; colon.pdf"],
  ['attachment; filename="say \\"hello\\".pdf"', "say hello.pdf"],
  ["attachment; filename=safe.pdf; filename*=UTF-8''%ZZ", "safe.pdf"],
  ["attachment; filename*=UTF-8''%FF", "report.pdf"],
  ["attachment; filename*=ISO-8859-1''x.pdf", "report.pdf"],
  ['attachment; filename="../../danger.exe"', "danger.pdf"],
  ["attachment; filename*=UTF-8''..%2F..%5Cname%00%0D%0A.zip", "name.pdf"],
  ['attachment; filename=".."', "report.pdf"],
  ['attachment; filename="CON.pdf"', "_CON.pdf"],
])("safely decodes %s", (header, expected) => expect(downloadFilename(header,"report.pdf","application/pdf")).toBe(expected));
it("forces the expected ZIP extension", () => expect(downloadFilename('attachment; filename="wages.pdf"',"report.zip","application/zip")).toBe("wages.zip"));
it("cleans the object URL even when clicking fails", () => {
  vi.useFakeTimers();
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: () => "blob:local", revokeObjectURL: revoke });
  vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(() => { throw new Error("blocked"); });
  expect(() => saveDownload({blob:new Blob(["x"]),filename:"report.pdf"})).toThrow("blocked");
  expect(document.querySelector("a")).toBeNull();
  vi.runAllTimers(); expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:local");
});
it.each([["application/pdf", ""], ["application/json", "{}"], ["application/zip", "zip"]])("rejects invalid PDF response %s %s", async (type, body) => {
  const api = createApiClient({baseUrl:"http://localhost/api/v1",session:createMemorySession(),fetch:vi.fn(async()=>new Response(body,{headers:{"Content-Type":type}}))});
  await expect(api.requestDownload("/report","application/pdf","report.pdf")).rejects.toMatchObject({kind:"protocol"});
});
