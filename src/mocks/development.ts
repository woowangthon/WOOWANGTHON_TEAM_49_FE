import { chatMocks } from './shared/chat-handlers';
import { http, HttpResponse } from "msw";
import { getApiBaseUrl } from "@/lib/config/env";
import { managementMocks } from "./shared/management-handlers";
import { documentMocks } from "./shared/document-handlers";
import { reviewMocks } from "./shared/review-handlers";
import { apiResponse } from "./shared/response";
import { samplePdf } from "./sample";
import { inputMocks } from "./shared/input-handlers";

export const demoAccount = { email: "worker@example.com", password: "password1234", name: "가상 근로자" };
// This cookie is an inert development marker, never an authentication credential.
const marker = "wageitda_mock_session";
export function clearMockSession() { document.cookie = `${marker}=; Path=/; Max-Age=0; SameSite=Lax`; }
export function createDevelopmentScenario(baseUrl = getApiBaseUrl()) {
  const management = managementMocks({ baseUrl, count: 2 });
  const cases = management.getCases();
  cases.splice(2);
  const docs = documentMocks(cases, baseUrl, true);
  const documents = docs.getDocuments();
  documents.splice(2);
  documents[0].documentType = "PAYSLIP";
  documents[0].fileName = "가상_급여명세서.pdf";
  documents[1].fileName = "가상_공유자료.pdf";
  cases.forEach(c => { c.status = "IN_PROGRESS"; c.currentStep = "REVIEW"; });
  docs.getLinks().push({ ...docs.getLinks()[0], linkId: 778, caseId: 16 });
  const review = reviewMocks(cases, documents, baseUrl, true, (c, old, next) => {
    const link = docs.getLinks().find(l => l.caseId === c && l.documentId === old);
    if (link) link.documentId = next;
  }, c => inputs.notifyInputChange(c));
  review.histories.splice(0);
  const inputs = inputMocks(management.getCases, baseUrl, c => docs.getLinks().filter(l=>l.caseId===c).flatMap(l=>documents.some(d=>d.documentId===l.documentId && d.documentType==="PAYSLIP")?[{documentId:l.documentId,fields:review.fields(c,l.documentId)}]:[]));
  // Seed real positive-ID snapshots through the existing synthetic publish pipeline.
  cases.forEach(c=>{inputs.getResult(c.caseId);inputs.notifyInputChange(c.caseId);inputs.setJobStatus(c.caseId,"PARTIAL");});
  const users = new Map([[demoAccount.email, { ...demoAccount, userId: 7 }]]);
  let activeUser = users.get(demoAccount.email)!;
  let token = "";
  const files = new Map<number, Blob>();
  const polls = new Map<number, number>();
  const fail = (errorCode: string, status: number) => apiResponse({ errorCode }, status);
  const issue = () => { token = `mock-only-${crypto.randomUUID()}`; return { accessToken: token, tokenType: "Bearer", expiresIn: 1800, user: { userId: activeUser.userId, email: activeUser.email, name: activeUser.name } }; };
  const sync = () => {
    const links = docs.getLinks();
    // A deleted Case removes links, preserving workplace originals.
    for (let i = links.length - 1; i >= 0; i--) if (!cases.some(c => c.caseId === links[i].caseId)) links.splice(i, 1);
    documents.forEach(d => { d.linkedCaseIds = links.filter(l => l.documentId === d.documentId).map(l => l.caseId); });
    cases.forEach(c => { c.documentCount = links.filter(l => l.caseId === c.caseId).length; });
  };
  const handlers = [
    http.post(`${baseUrl}/auth/signup`, async ({ request }) => {
      const body = await request.json() as typeof demoAccount;
      if (!body.email || !body.password || !body.name) return fail("VALIDATION_ERROR", 422);
      if (users.has(body.email)) return fail("EMAIL_ALREADY_EXISTS", 409);
      users.set(body.email, { ...body, userId: users.size + 7 });
      return apiResponse({ userId: users.get(body.email)!.userId, email: body.email, name: body.name }, 201);
    }),
    http.post(`${baseUrl}/auth/login`, async ({ request }) => {
      const body = await request.json() as typeof demoAccount;
      const user = users.get(body.email);
      if (!user || user.password !== body.password) return fail("INVALID_CREDENTIALS", 401);
      activeUser = user;
      document.cookie = `${marker}=${encodeURIComponent(user.email)}; Path=/; SameSite=Lax`;
      return apiResponse(issue());
    }),
    http.post(`${baseUrl}/auth/refresh`, () => {
      const email = document.cookie.split("; ").find(v => v.startsWith(`${marker}=`))?.slice(marker.length + 1);
      const user = email && users.get(decodeURIComponent(email));
      if (!user) return fail("AUTH_REQUIRED", 401);
      activeUser = user;
      return apiResponse(issue());
    }),
    http.post(`${baseUrl}/auth/logout`, () => { token = ""; clearMockSession(); return new HttpResponse(null, { status: 204 }); }),
    // Guard every supported resource before resolving shared handlers. Never bypass an API request.
    http.all(`${baseUrl}/*`, async ({ request }) => {
      if (!token || request.headers.get("Authorization") !== `Bearer ${token}`) return fail("AUTH_REQUIRED", 401);
      sync();
      const path = new URL(request.url).pathname;
      const c = path.match(/\/cases\/(\d+)/)?.[1];
      const w = path.match(/\/workplaces\/(\d+)/)?.[1];
      const d = path.match(/\/documents\/(\d+)/)?.[1];
      const candidate = [...review.replacements.values()].find(r => r.documentId === Number(d));
      if (candidate && !documents.some(v => v.documentId === Number(d))) {
        const original = documents.find(v => v.documentId === candidate.oldDocumentId)!;
        documents.push({ ...original, documentId: candidate.documentId, linkedCaseIds: [], fileName: "가상_교체원본.pdf", reviewStatus: "NOT_STARTED" });
      }
      if (c && !cases.some(v => v.caseId === Number(c))) return fail("RESOURCE_NOT_FOUND", 404);
      if (w && !management.getWorkplace(Number(w))) return fail("RESOURCE_NOT_FOUND", 404);
      if (d) {
        const doc = documents.find(v => v.documentId === Number(d));
        if (!doc || (w && doc.workplaceId !== Number(w)) || (c && !doc.linkedCaseIds?.includes(Number(c)))) return fail("RESOURCE_NOT_FOUND", 404);
        if (request.method === "GET" && /\/documents\/\d+$/.test(path) && ["UPLOADED", "PROCESSING"].includes(doc.processingStatus)) {
          const count = (polls.get(doc.documentId) ?? 0) + 1; polls.set(doc.documentId, count);
          doc.processingStatus = count > 1 ? "READY" : "PROCESSING"; doc.progress = count > 1 ? 100 : 50;
        }
      }
      if (request.method === "POST" && /\/(documents|replace)$/.test(path)) {
        const form = await request.clone().formData(); const file = form.get("file");
        if (!(file instanceof File) || !file.size) return fail("INVALID_FILE", 422);
        if (file.size > 20 * 1024 * 1024) return fail("FILE_TOO_LARGE", 413);
        if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) return fail("UNSUPPORTED_FILE_TYPE", 415);
        // Uploads return the actual local file in the viewer; OCR fields remain synthetic.
        const nextId = path.endsWith("/replace") ? 901 + review.replacements.size : Math.max(100, ...documents.map(d => d.documentId)) + 1;
        files.set(nextId, file);
      }
    }),
    http.get(`${baseUrl}/users/me`, () => apiResponse({ userId: activeUser.userId, email: activeUser.email, name: activeUser.name })),
    http.get(`${baseUrl}/cases/:c/documents`, ({ request, params }) => {
      const caseId = Number(params.c);
      const q = new URL(request.url).searchParams;
      const page = Math.max(1, Number(q.get("page") ?? 1)), size = Math.min(100, Math.max(1, Number(q.get("size") ?? 20)));
      const items = docs.getLinks().filter(l => l.caseId === caseId).map(link => {
        const doc = documents.find(d => d.documentId === link.documentId)!;
        return { ...doc, link, reviewStatus: review.reviewStates.get(`${caseId}:${doc.documentId}`) ?? "NOT_STARTED" };
      });
      return apiResponse({ items: items.slice((page - 1) * size, page * size), page, size, total: items.length });
    }),
    http.get(`${baseUrl}/workplaces/:w/documents/:d/preview`, ({ params }) => apiResponse({ documentId: Number(params.d), mediaType: files.get(Number(params.d))?.type ?? "application/pdf", pageCount: 1, coordinateSystem: "RELATIVE_0_1", rotationDegrees: 0, supportsHighlight: false })),
    http.get(`${baseUrl}/workplaces/:w/documents/:d/file`, async ({ params }) => {
      const file = files.get(Number(params.d));
      return new HttpResponse(file ? await file.arrayBuffer() : samplePdf(), { headers: { "Content-Type": file?.type ?? "application/pdf" } });
    }),
    http.get(`${baseUrl}/cases/:c/deletion-impact`, ({ params }) => {
      const linked = docs.getLinks().filter(l => l.caseId === Number(params.c));
      return apiResponse({ linkedDocumentCount: linked.length, sharedDocumentCount: linked.filter(l => documents.find(d => d.documentId === l.documentId)!.linkedCaseIds!.length > 1).length, reportCount: 0, willUnlinkSharedDocuments: true, willDeleteSharedOriginals: false, willRevokeCaseAccessImmediately: true });
    }),
    ...chatMocks(baseUrl, management.getCases, caseId=>{
      const result=inputs.getResult(caseId);if(!result)return;
      const sources=docs.getLinks().filter(l=>l.caseId===caseId).flatMap(l=>{
        if(!documents.some(d=>d.documentId===l.documentId))return [];
        const field=review.fields(caseId,l.documentId).find(f=>!!f.source);
        return field?.source?[{...field.source,text:field.source.text??undefined,documentId:l.documentId,caseId,fieldId:field.fieldId}]:[];
      });
      const resultRefs=Object.entries(result.versions).flatMap(([type,v])=>v?.snapshotId&&v.version?[{caseId,type,snapshotId:v.snapshotId,version:v.version}]:[]);
      return {sources,resultRefs,inputVersion:result.currentInputVersion};
    }).handlers, ...inputs.handlers, ...review.handlers, ...docs.handlers, ...management.handlers,
    http.all(`${baseUrl}/*`, () => {
      window.dispatchEvent(new Event("wageitda:mock-unhandled"));
      return apiResponse({ errorCode: "MOCK_NOT_IMPLEMENTED" }, 501);
    }),
  ];
  sync();
  return { handlers, management, docs, review, inputs };
}
