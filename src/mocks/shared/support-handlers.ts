import { reportPdf, snapshotZip, type MockOriginal } from "./report-files";
import { http, HttpResponse } from "msw";
import { apiResponse } from "./response";
import type { Report } from "@/features/case-support/schemas";
import type { Results } from "@/features/results/schemas";

// Only MSW consumes this scenario header; never a real API parameter.
const scenario = (request: Request) => request.headers.get("X-Wageitda-Mock-Scenario");
export function supportMocks(base: string, getResult: (c: number) => Results | undefined, allowed: (c: number) => number[], original?: (c: number, id: number) => Promise<MockOriginal | undefined>) {
  const records = new Map<number, Report[]>(), polls = new Map<number, number>();
  const artifacts = new Map<number, { pdf: Uint8Array<ArrayBuffer>; zip: Uint8Array<ArrayBuffer> }>();
  const keys = new Map<string, { body: string; report: Report }>();
  const failed = new Set<number>();
  let sequence = 90;
  const fail = (code: string, status: number) => apiResponse({ errorCode: code }, status);
  const missing = () => fail("RESOURCE_NOT_FOUND", 404);
  const view = (c: number, r: Report) => ({ ...r, isCurrent: r.basedOnInputVersion === getResult(c)?.currentInputVersion });
  const stale = (r: Results) => !Object.values(r.versions).some(v => v?.snapshotId) || Object.values(r.versions).some(v => v && ["UPDATING", "STALE"].includes(v.freshness));
  return [
    http.get(`${base}/consultation-centers`, ({ request }) => {
      if (scenario(request) === "centers-error") return fail("UPSTREAM_UNAVAILABLE", 503);
      const q = new URL(request.url).searchParams;
      const region = q.get("region") ?? "", category = q.get("category");
      const page = Math.max(1, Number(q.get("page")) || 1), size = Math.min(100, Math.max(1, Number(q.get("size")) || 20));
      const local = { centerId: 1, name: "개발용 예시 지역 상담기관 — 실제 운영기관이 아닙니다", region: "청주시", categories: ["임금"], phone: null, website: null, sourceUrl: null, verifiedAt: null, dataSource: "MOCK", isNationwide: false };
      const nationwide = { ...local, centerId: 2, name: "개발용 예시 전국 상담 안내", region: "전국", isNationwide: true };
      const fallback = !region || !local.region.includes(region);
      const items = scenario(request) === "centers-empty" || region === "정보없음" || (category && category !== "WAGE") ? [] : [fallback ? nationwide : local];
      return apiResponse({ items: items.slice((page - 1) * size, page * size), page, size, total: items.length, nationwideFallbackUsed: items.length > 0 && fallback });
    }),
    http.post(`${base}/cases/:c/company-inquiry`, async ({ params, request }) => {
      const result = getResult(Number(params.c)); if (!result) return missing();
      if (scenario(request) === "inquiry-503") return fail("UPSTREAM_UNAVAILABLE", 503);
      if (scenario(request) === "inquiry-409" || stale(result)) return fail("REPORT_SOURCE_STALE", 409);
      const body = await request.json();
      if (!body || typeof body !== "object" || Object.keys(body).length) return fail("VALIDATION_ERROR", 422);
      return apiResponse({ text: "[개발용 서버 초안 예시] 급여 산정에 사용된 조건과 자료를 확인 부탁드립니다. 표시된 차이는 확정된 미지급임금이 아니며 관련 근거를 함께 검토하고 싶습니다.", basedOnResultVersions: Object.fromEntries(Object.entries(result.versions).map(([k,v]) => [k,v?.version ?? null])), requiresUserReview: true });
    }),
    http.get(`${base}/cases/:c/questions`, ({ params }) => !getResult(Number(params.c)) ? missing() : apiResponse({ questions: Number(params.c) === 15 ? [{ questionId: 12, type: "MISSING_CONDITION", question: "계산 조건을 확인해 주세요.", reason: "개발용 예시 질문입니다.", relatedItemId: "conditions" }] : [] })),
    http.get(`${base}/cases/:c/reports`, ({ params }) => { const c = Number(params.c); return getResult(c) ? apiResponse({ items: (records.get(c) ?? []).map(r => view(c,r)) }) : missing(); }),
    http.post(`${base}/cases/:c/reports`, async ({ params, request }) => {
      const c = Number(params.c), result = getResult(c); if (!result) return missing();
      const body = await request.json() as { documentIds: number[]; includeOriginalDocuments: boolean; useLatestAvailableResults: boolean; acknowledgeOutdatedResults: boolean };
      if (!body || !Array.isArray(body.documentIds) || new Set(body.documentIds).size !== body.documentIds.length || body.documentIds.some(id => !allowed(c).includes(id)) || (!body.includeOriginalDocuments && body.documentIds.length)) return fail("INVALID_DOCUMENT_SELECTION", 422);
      const key = request.headers.get("Idempotency-Key"), scopedKey = `${c}:${key}`, serialized = JSON.stringify(body);
      const prior = key ? keys.get(scopedKey) : undefined;
      if (prior) return prior.body === serialized ? apiResponse(prior.report, 202) : fail("IDEMPOTENCY_KEY_REUSED", 409);
      if (body.useLatestAvailableResults !== true || body.acknowledgeOutdatedResults !== false || scenario(request) === "report-stale" || stale(result)) return fail("REPORT_SOURCE_STALE", 409);
      const r: Report = { reportId: sequence++, version: (records.get(c)?.length ?? 0) + 1, status: "PROCESSING", basedOnInputVersion: result.currentInputVersion, referencedSnapshots: Object.fromEntries(Object.entries(result.versions).map(([k,v]) => [k,v?.snapshotId ?? null])), selectedDocumentIds: [...body.documentIds], createdAt: new Date().toISOString(), isCurrent: true };
      const files: MockOriginal[] = [];
      for (const id of r.selectedDocumentIds) { const file = await original?.(c,id); if (!file) return fail("INVALID_DOCUMENT_SELECTION", 422); files.push({ ...file, bytes: file.bytes.slice() }); }
      // Freeze the metadata and exact original bytes at acceptance time.
      artifacts.set(r.reportId, { pdf: reportPdf(r), zip: snapshotZip(r,files) });
      records.set(c, [r, ...records.get(c) ?? []]);
      if (key) keys.set(scopedKey, { body: serialized, report: structuredClone(r) });
      if (scenario(request) === "report-failed") failed.add(r.reportId);
      return apiResponse(r,202);
    }),
    http.get(`${base}/cases/:c/reports/:r`, ({ params }) => {
      const c = Number(params.c); if (!getResult(c)) return missing();
      const r = records.get(c)?.find(r => r.reportId === Number(params.r)); if (!r) return missing();
      const n = polls.get(r.reportId) ?? 0; polls.set(r.reportId,n+1);
      if (n >= 2) { r.status = failed.has(r.reportId) ? "FAILED" : "READY"; r.errorCode = failed.has(r.reportId) ? "MOCK_REPORT_FAILED" : null; }
      return apiResponse(view(c,r));
    }),
    http.get(`${base}/cases/:c/reports/:r/:kind`, async ({ params, request }) => {
      const c = Number(params.c); if (!getResult(c)) return missing();
      const r = records.get(c)?.find(r => r.reportId === Number(params.r)); if (!r) return missing();
      if (r.status !== "READY" || scenario(request) === "download-not-ready") return fail("REPORT_NOT_READY",409);
      for (const id of r.selectedDocumentIds) if (!await original?.(c,id)) return missing();
      if (params.kind !== "pdf" && params.kind !== "originals") return missing();
      const pdf = params.kind === "pdf", file = artifacts.get(r.reportId); if (!file) return missing();
      const ext = pdf ? "pdf" : "zip";
      const headers: Record<string,string> = { "Content-Type": pdf ? "application/pdf" : "application/zip" };
      if (scenario(request) !== "filename-absent") headers["Content-Disposition"] = scenario(request) === "filename-invalid" ? `attachment; filename*=UTF-8''%ZZ` : `attachment; filename="report-${r.reportId}.${ext}"; filename*=UTF-8''${encodeURIComponent(`상담 자료 ${r.reportId}.${ext}`)}`;
      return new HttpResponse(pdf ? file.pdf : file.zip, { headers });
    }),
  ];
}
