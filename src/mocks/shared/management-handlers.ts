import { workplaceCreateSchema, workplacePatchSchema } from "@/features/workplaces/schemas";
import { http, HttpResponse } from "msw";

import type { CaseDetailDto } from "@/features/cases/schemas";
import type { WorkplaceDto } from "@/features/workplaces/schemas";

import { caseCreateValidator, casePatchValidator } from "./management-validation";

import { apiResponse } from "./response";

/** Stateful test fixtures only. No production module imports these handlers. */
export function managementMocks({ empty = false, count = 21, idOffset = 0, baseUrl: testApiUrl = "http://127.0.0.1:8000/api/v1" } = {}) {
  let workplaces: WorkplaceDto[] = empty ? [] : Array.from({ length: count }, (_, index) => ({
    workplaceId: index + 3, name: index === 0 ? "카페 나무" : `근무지 ${index + 3}`,
    industry: index === 0 ? "음식점" : null, region: index === 0 ? "청주시" : null,
    employmentStatus: "CURRENT", createdAt: "2026-11-09", updatedAt: "2026-11-09", caseCount: 0,
  }));
  const cases: CaseDetailDto[] = empty ? [] : Array.from({ length: count }, (_, index) => ({
    caseId: index + 15, workplaceId: 3,
    workplace: { workplaceId: 3, name: "카페 나무", industry: "음식점", region: "청주시" },
    payType: "HOURLY", periodStart: "2026-10-03", periodEnd: "2026-11-02", scheduledPayDate: null,
    status: index === 0 ? "COMPLETED" : "CREATED", currentStep: "UPLOAD",
    latestCalculationId: null, documentCount: index === 0 ? 3 : 0, inputVersion: 7,
    attentionRequired: index === 0, attentionCount: index === 0 ? 2 : 0,
    updatedAt: `2026-11-${String((index % 8) + 1).padStart(2, "0")}T00:00:00+00:00`,
  }));
  const requests: { method: string; path: string; body?: Record<string, unknown> }[] = [];
  const workplace = (id: number) => {
    const item = workplaces.find((row) => row.workplaceId === id);
    return item ? { ...item, caseCount: cases.filter((row) => row.workplaceId === id).length } : undefined;
  };
  const caseDto = (item: CaseDetailDto) => ({ ...item, workplace: workplace(item.workplaceId) });
  const page = <T,>(request: Request, items: T[]) => {
    const params = new URL(request.url).searchParams;
    const page = Number(params.get("page") ?? 1);
    const size = Number(params.get("size") ?? 20);
    return apiResponse({ items: items.slice((page - 1) * size, page * size), page, size, total: items.length });
  };
  const record = async (request: Request) => {
    const body = await request.json().catch(() => null) as Record<string, unknown>;
    requests.push({ method: request.method, path: new URL(request.url).pathname, body });
    return body;
  };
  const missing = () => apiResponse({ errorCode: "RESOURCE_NOT_FOUND" }, 404);
  const handlers = [
    http.get(`${testApiUrl}/workplaces`, ({ request }) => {
      requests.push({ method: "GET", path: new URL(request.url).pathname + new URL(request.url).search });
      return page(request, workplaces.map((row) => workplace(row.workplaceId)!));
    }),
    http.post(`${testApiUrl}/workplaces`, async ({ request }) => {
      const body = await record(request);
      if (!workplaceCreateSchema.safeParse(body).success) return apiResponse({ errorCode: "VALIDATION_ERROR" }, 422);
      const workplaceId = Math.max(2 + idOffset, ...workplaces.map((row) => row.workplaceId)) + 1;
      workplaces.push({ workplaceId, name: body.name as string, industry: (body.industry ?? null) as string | null, region: (body.region ?? null) as string | null, employmentStatus: (body.employmentStatus ?? "CURRENT") as "CURRENT" | "FORMER", createdAt: "2026-11-09", updatedAt: "2026-11-09", caseCount: 0 });
      return apiResponse({ workplaceId }, 201);
    }),
    http.get(`${testApiUrl}/workplaces/:id`, ({ params }) => {
      const dto = workplace(Number(params.id));
      return dto ? apiResponse(dto) : missing();
    }),
    http.patch(`${testApiUrl}/workplaces/:id`, async ({ request, params }) => {
      const body = await record(request);
      if (!workplacePatchSchema.safeParse(body).success) return apiResponse({ errorCode: "VALIDATION_ERROR" }, 422);
      const item = workplaces.find((row) => row.workplaceId === Number(params.id));
      if (!item) return missing();
      // P0 accepts null here, but the DTO requires non-null name/status.
      // Null leaves these values unchanged; nullable fields can be cleared.
      if (body.name != null) item.name = body.name as string;
      if (body.employmentStatus != null) item.employmentStatus = body.employmentStatus as WorkplaceDto["employmentStatus"];
      if ("industry" in body) item.industry = body.industry as string | null;
      if ("region" in body) item.region = body.region as string | null;
      return apiResponse(workplace(item.workplaceId));
    }),
    http.delete(`${testApiUrl}/workplaces/:id`, ({ params }) => {
      requests.push({ method: "DELETE", path: `/api/v1/workplaces/${params.id}` });
      const item = workplace(Number(params.id));
      if (!item) return missing();
      if (item.caseCount) return apiResponse({ errorCode: "RESOURCE_HAS_DEPENDENCIES" }, 409);
      workplaces = workplaces.filter((row) => row.workplaceId !== item.workplaceId);
      return new HttpResponse(null, {status:204});
    }),
    http.get(`${testApiUrl}/workplaces/:id/cases`, ({ request, params }) => page(request, cases.filter((row) => row.workplaceId === Number(params.id)).map(caseDto))),
    http.get(`${testApiUrl}/cases`, ({ request }) => page(request, cases.map(caseDto))),
    http.post(`${testApiUrl}/cases`, async ({ request }) => {
      const body = await record(request);
      if (!caseCreateValidator(body)) return apiResponse({ errorCode: "VALIDATION_ERROR" }, 422);
      const owner = workplace(body.workplaceId);
      if (!owner) return missing();
      const caseId = Math.max(14 + idOffset, ...cases.map((row) => row.caseId)) + 1;
      cases.push({ caseId, workplaceId: owner.workplaceId, workplace: owner, payType: body.payType as "HOURLY" | "MONTHLY", periodStart: body.periodStart as string, periodEnd: body.periodEnd as string, scheduledPayDate: body.scheduledPayDate ?? null, status: "CREATED", currentStep: "UPLOAD", latestCalculationId: null, documentCount: 0, inputVersion: 1, attentionRequired: false, attentionCount: 0, updatedAt: "2026-11-09T00:00:00+00:00" });
      return apiResponse({ caseId, status: "CREATED", inputVersion: 1, recompute: { scheduled: true, jobId: "job-msw", affectedChecks: [] } }, 201);
    }),
    http.get(`${testApiUrl}/cases/:id`, ({ params }) => {
      const item = cases.find((row) => row.caseId === Number(params.id));
      return item ? apiResponse(caseDto(item)) : missing();
    }),
    http.patch(`${testApiUrl}/cases/:id`, async ({ request, params }) => {
      const body = await record(request);
      if (!casePatchValidator(body)) return apiResponse({ errorCode: "VALIDATION_ERROR" }, 422);
      const item = cases.find((row) => row.caseId === Number(params.id));
      if (!item) return missing();
      if (body.expectedInputVersion !== item.inputVersion) return apiResponse({ errorCode: "INPUT_VERSION_CONFLICT", details: { expectedInputVersion: body.expectedInputVersion, currentInputVersion: item.inputVersion } }, 409);
      // Apply only declared writable fields. Null cannot clear non-null DTO fields.
      if (body.payType != null) item.payType = body.payType;
      if (body.periodStart != null) item.periodStart = body.periodStart;
      if (body.periodEnd != null) item.periodEnd = body.periodEnd;
      if ("scheduledPayDate" in body) item.scheduledPayDate = body.scheduledPayDate ?? null;
      item.inputVersion += 1;
      return apiResponse({ inputVersion: item.inputVersion, recompute: { scheduled: true, jobId: "job-msw" } });
    }),
    http.get(`${testApiUrl}/cases/:id/deletion-impact`, ({ params }) => {
      requests.push({ method: "GET", path: `/api/v1/cases/${params.id}/deletion-impact` });
      return apiResponse({ linkedDocumentCount: 3, sharedDocumentCount: 1, reportCount: 2, willUnlinkSharedDocuments: true, willDeleteSharedOriginals: false, willRevokeCaseAccessImmediately: true });
    }),
    http.delete(`${testApiUrl}/cases/:id`, ({ params }) => {
      requests.push({ method: "DELETE", path: `/api/v1/cases/${params.id}` });
      cases.splice(0, cases.length, ...cases.filter((row) => row.caseId !== Number(params.id)));
      return new HttpResponse(null, { status: 204 });
    }),
  ];
  return { handlers, requests, getWorkplace: workplace, getCases: () => cases };
}
