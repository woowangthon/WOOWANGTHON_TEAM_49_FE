import { documentTypePatchSchema, linkCreateSchema, linkPatchSchema } from "@/features/documents/schemas";
import { http, HttpResponse } from "msw";
import type { ConcreteDocumentType, DocumentDto } from "@/features/documents/schemas";
import type { CaseDetailDto } from "@/features/cases/schemas";
import { apiResponse } from "./response";
// Mock-only stand-in for the agent's classifier: a file name keyword, never a real reading.
const mockTypeKeywords: [RegExp, ConcreteDocumentType][] = [[/계약/, "CONTRACT"], [/근태|출퇴근|출근/, "ATTENDANCE"], [/입금|거래내역|통장/, "DEPOSIT"], [/명세/, "PAYSLIP"]];
/** Finish mock processing like the backend: AUTO takes the detected type; a conflict needs a user decision. */
export function settleMockDocument(doc: DocumentDto) {
  const detected = mockTypeKeywords.find(([pattern]) => pattern.test(doc.fileName))?.[1];
  const metadata: Record<string, NonNullable<DocumentDto["aiMetadata"]>[string]> = { ...(doc.aiMetadata ?? {}) };
  delete metadata.detectedType;
  doc.progress = 100;
  if (doc.documentType === "AUTO" && !detected) Object.assign(doc, { processingStatus: "REVIEW_REQUIRED", errorCode: "DOCUMENT_TYPE_UNRESOLVED" });
  else if (doc.documentType !== "AUTO" && detected && detected !== doc.documentType) {
    Object.assign(doc, { processingStatus: "REVIEW_REQUIRED", errorCode: "DOCUMENT_TYPE_MISMATCH" });
    metadata.detectedType = detected;
  } else {
    if (doc.documentType === "AUTO" && detected) { doc.documentType = detected; metadata.detectedType = detected; }
    Object.assign(doc, { processingStatus: "READY", errorCode: null });
  }
  doc.aiMetadata = metadata;
}
// Explicit wire projection: internal mock link records never leak into DocumentDTO.
export function caseDocumentResponse(d: DocumentDto, linkId: number | null) {
  return { ...d, linkId };
}
export function documentMocks(cases: CaseDetailDto[], testApiUrl = "http://127.0.0.1:8000/api/v1", development = false, idOffset = 0) {
  const documents: DocumentDto[] = Array.from({length: 21}, (_, i) => ({ documentId: 101 + i, workplaceId: 3, workplaceName: "카페 나무", documentType: i === 0 ? "CONTRACT" : "PAYSLIP", fileName: i === 0 ? "근로계약서.pdf" : `급여명세서-${i}.pdf`, processingStatus: development && i === 1 ? "READ_READY" : "READY", reviewStatus: "NOT_STARTED", progress: 100, linkId: null, errorCode: null, aiMetadata: null, linkedCaseIds: i === 0 ? [15, 16] : [], uploadedAt: "2026-11-09T00:00:00+00:00" }));
  let links: {linkId:number;caseId:number;documentId:number;purpose:string|null;applicableFrom:string|null;applicableTo:string|null;overrideCount:number}[] = [{ linkId: 777, caseId: 15, documentId: 101, purpose: "CONTRACT_FOR_PERIOD", applicableFrom: "2026-10-03", applicableTo: "2026-11-02", overrideCount: 0 }];
  const requests: {method: string; path: string; body?: Record<string, unknown>}[] = [];
  const record = (request: Request, body?: Record<string, unknown>) => !development && requests.push({method: request.method, path: new URL(request.url).pathname + new URL(request.url).search, body});
  const page = (request: Request, items: DocumentDto[]) => { const q = new URL(request.url).searchParams; const page = Number(q.get("page") ?? 1); const size = Number(q.get("size") ?? 20); return apiResponse({items: items.slice((page-1)*size, page*size), page, size, total: items.length}); };
  const filter = (request: Request) => { const owner = new URL(request.url).pathname.match(/workplaces\/(\d+)/)?.[1]; const q = new URL(request.url).searchParams; return documents.filter(d => (!development || !owner || d.workplaceId === Number(owner)) && (!q.get("documentType") || q.get("documentType") === d.documentType) && (!q.get("workplaceId") || Number(q.get("workplaceId")) === d.workplaceId)); };
  const current = (id: number) => cases.find(c => c.caseId === id)!;
  const bump = (id: number) => { current(id).inputVersion++; current(id).documentCount = links.filter(l => l.caseId === id).length; return current(id).inputVersion; };
  const conflict = (id: number, body: Record<string, unknown>) => body.expectedInputVersion !== current(id).inputVersion;
  const error = (errorCode: string, status = 409) => apiResponse({errorCode}, status);
  const upload = async (request: Request, caseId?: number) => {
    const form = await request.formData(); record(request, { documentType: form.get("documentType"), fileName: (form.get("file") as File)?.name });
    const documentId = Math.max(100 + idOffset, ...documents.map(d => d.documentId)) + 1;
    const dto: DocumentDto = {documentId, workplaceId: development ? (caseId ? current(caseId).workplaceId : Number(new URL(request.url).pathname.split("/").at(-2))) : 3, documentType: form.get("documentType") as DocumentDto["documentType"], fileName: (form.get("file") as File).name, processingStatus: "UPLOADED", reviewStatus: "NOT_STARTED", progress: 10, linkId: null, errorCode: null, aiMetadata: null, uploadedAt: "2026-11-09", linkedCaseIds: caseId ? [caseId] : []};
    documents.push(dto);
    if (caseId) { links.push({linkId: documentId + 700, caseId, documentId, purpose: "CONTRACT_FOR_PERIOD", applicableFrom: current(caseId).periodStart, applicableTo: current(caseId).periodEnd, overrideCount: 0}); bump(caseId); }
    return apiResponse({documentId, processingStatus: "UPLOADED", reviewStatus: "NOT_STARTED", progress: 10, duplicateCandidateIds: []}, 202);
  };
  const handlers = [
    http.get(`${testApiUrl}/documents`, ({ request }) => { record(request); return page(request, filter(request)); }),
    http.get(`${testApiUrl}/workplaces/:w/documents`, ({ request }) => { record(request); return page(request, filter(request)); }),
    http.get(`${testApiUrl}/cases/:c/documents`, ({ request, params }) => { record(request); return page(request, documents.filter(d => links.some(l => l.caseId === Number(params.c) && l.documentId === d.documentId)).map(d => caseDocumentResponse(d, links.find(l => l.caseId === Number(params.c) && l.documentId === d.documentId)!.linkId))); }),
    http.post(`${testApiUrl}/cases/:c/documents`, ({ request, params }) => upload(request, Number(params.c))),
    http.post(`${testApiUrl}/workplaces/:w/documents`, ({ request }) => upload(request)),
    http.get(`${testApiUrl}/cases/:c/documents/:d`, ({request, params}) => { record(request); const d = documents.find(d => d.documentId === Number(params.d)); return d ? apiResponse(caseDocumentResponse(d, links.find(l => l.caseId === Number(params.c) && l.documentId === d.documentId)?.linkId ?? null)) : error("RESOURCE_NOT_FOUND", 404); }),
    http.get(`${testApiUrl}/workplaces/:w/documents/:d`, ({request, params}) => { record(request); const d = documents.find(d => d.documentId === Number(params.d)); return d ? apiResponse(d) : error("RESOURCE_NOT_FOUND", 404); }),
    http.post(`${testApiUrl}/cases/:c/documents/:d/retry`, ({request, params}) => { record(request); const dto = documents.find(d => d.documentId === Number(params.d))!; dto.processingStatus = "PROCESSING"; return apiResponse({documentId: dto.documentId, processingStatus: "PROCESSING"}, 202); }),
    http.post(`${testApiUrl}/cases/:c/document-links`, async ({request, params}) => {
      const body = await request.json() as Record<string, unknown>; record(request, body); const c = Number(params.c);
      if (!(request.method === "POST" ? linkCreateSchema : linkPatchSchema).safeParse(body).success) return error("VALIDATION_ERROR", 422); if (conflict(c, body)) return error("INPUT_VERSION_CONFLICT");
      if (links.some(l => l.caseId === c && l.documentId === body.documentId)) return error("DUPLICATE_DOCUMENT_LINK");
      const link = {linkId: 778 + links.length, caseId: c, documentId: Number(body.documentId), purpose: body.purpose == null ? null : String(body.purpose), applicableFrom: body.applicableFrom as string, applicableTo: body.applicableTo as string, overrideCount: 0}; links.push(link);
      documents.find(d => d.documentId === link.documentId)!.linkedCaseIds!.push(c);
      return apiResponse({...link, inputVersion: bump(c)}, 201);
    }),
    http.patch(`${testApiUrl}/cases/:c/document-links/:l`, async ({request, params}) => { const body = await request.json() as Record<string, unknown>; record(request, body); const c = Number(params.c); if (!(request.method === "POST" ? linkCreateSchema : linkPatchSchema).safeParse(body).success) return error("VALIDATION_ERROR", 422); if (conflict(c, body)) return error("INPUT_VERSION_CONFLICT"); const link = links.find(l => l.linkId === Number(params.l))!; Object.assign(link, Object.fromEntries(Object.entries(body).filter(([key]) => key !== "expectedInputVersion"))); return apiResponse({...link, inputVersion: bump(c)}); }),
    http.delete(`${testApiUrl}/cases/:c/document-links/:l`, async ({request, params}) => { record(request); const c = Number(params.c); const link = links.find(l => l.linkId === Number(params.l))!; if (!link) return error("RESOURCE_NOT_FOUND", 404); links = links.filter(l => l !== link); const dto = documents.find(d => d.documentId === link.documentId)!; dto.linkedCaseIds = dto.linkedCaseIds!.filter(id => id !== c); bump(c); return new HttpResponse(null, {status:204}); }),
    http.get(`${testApiUrl}/workplaces/:w/documents/:d/deletion-impact`, ({request, params}) => { record(request); const dto = documents.find(d => d.documentId === Number(params.d)); if (!dto) return error("RESOURCE_NOT_FOUND", 404); return apiResponse({documentId: dto.documentId, affectedCaseIds: dto.linkedCaseIds, linkedCaseCount: dto.linkedCaseIds!.length, derivedTransactionIds: [], downloadedExternalCopiesCannotBeRecalled: true}); }),
    http.patch(`${testApiUrl}/workplaces/:w/documents/:d`, async ({request, params}) => {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null; record(request, body ?? undefined);
      const parsed = documentTypePatchSchema.safeParse(body); if (!parsed.success) return error("VALIDATION_ERROR", 422);
      const dto = documents.find(d => d.documentId === Number(params.d)); if (!dto) return error("RESOURCE_NOT_FOUND", 404);
      if (["UPLOADED", "PROCESSING"].includes(dto.processingStatus)) return error("DOCUMENT_STILL_PROCESSING");
      const metadata: Record<string, NonNullable<DocumentDto["aiMetadata"]>[string]> = { ...(dto.aiMetadata ?? {}), legacyAutoExtract: true };
      delete metadata.detectedType;
      Object.assign(dto, { documentType: parsed.data.documentType, processingStatus: "PROCESSING", progress: 40, errorCode: null, aiMetadata: metadata });
      return apiResponse(dto, 202);
    }),
    http.delete(`${testApiUrl}/workplaces/:w/documents/:d`, ({request, params}) => { record(request); if (new URL(request.url).searchParams.get("confirm") !== "true") return error("DOCUMENT_SHARED_REFERENCES_EXIST"); documents.splice(0, documents.length, ...documents.filter(d => d.documentId !== Number(params.d))); links = links.filter(l => l.documentId !== Number(params.d)); return new HttpResponse(null, {status:204}); }),
    http.get(`${testApiUrl}/cases/:c/recompute-status`, ({request, params}) => { record(request); return apiResponse({caseId: Number(params.c), currentInputVersion: current(Number(params.c)).inputVersion, results: {}, activeJob: null, pending: 0, running: 0, latestJob: {status: "PARTIAL"}}); }),
  ];
  return {handlers, requests, getDocuments: () => documents, getLinks: () => links};
}
