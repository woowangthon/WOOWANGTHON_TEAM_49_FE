// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { server, testApiUrl } from '@/test/server';
import { clearMockSession, createDevelopmentScenario, demoAccount } from '@/mocks/development';
import { createAppServices } from '@/lib/app-services';
import { workplaceApi } from '@/features/workplaces/api';
import { caseApi } from '@/features/cases/api';
import { documentApi } from '@/features/documents/api';
import { reviewApi } from '@/features/documents/review/api';
import { caseInputsApi } from '@/features/case-inputs/api';
import { resultsApi } from '@/features/results/api';
import { supportApi } from '@/features/case-support/api';
import { chatApi } from '@/features/chats/api';
import { consumeChat, type ChatEvent } from '@/features/chats/stream';
import { createOpenApiContract, type ContractRequest } from './contract';

afterEach(() => clearMockSession());

// All HTTP is intercepted by MSW. This verifies local P0 compatibility, never a live server.
it('checks cross-feature FE wire requests and mock responses against independent P0', async () => {
  clearMockSession();
  server.use(...createDevelopmentScenario(testApiUrl).handlers);
  const contract = createOpenApiContract();
  const app = createAppServices(testApiUrl);
  const requests = new Map<string, Request>();
  const pending: Promise<void>[] = [];
  const failures: unknown[] = [];
  const observed = new Set<string>();
  let refreshRequests = 0;
  const capture = ({ request, requestId }: { request: Request; requestId: string }) => {
    requests.set(requestId, request.clone());
    if (new URL(request.url).pathname === '/api/v1/auth/refresh') refreshRequests++;
  };
  const observe = ({ requestId, response }: { requestId: string; response: Response }) => {
    const request = requests.get(requestId)!;
    const copy = response.clone();
    pending.push((async () => {
      const text = await request.text();
      const input: ContractRequest = {
        method: request.method, url: request.url, headers: Object.fromEntries(request.headers),
        body: text ? JSON.parse(text) : undefined,
      };
      const label = `${input.method} ${new URL(input.url).pathname}`;
      observed.add(label);
      expect(contract.request(input), label).toMatchObject({ valid: true, undeclaredQuery: [] });
      // The oracle intentionally does not claim to validate SSE frames.
      // Feature consumeChat below validates their order, payloads and terminal event.
      if (copy.headers.get('content-type')?.startsWith('text/event-stream')) {
        expect(copy.status).toBe(200);
        // A tee branch cancellation can wait on MSW's other branch; do not await it.
        void copy.body?.cancel().catch(() => undefined);
      } else {
        expect(await contract.httpResponse(input, copy), label).toMatchObject({ valid: true });
      }
    })().catch(error => { failures.push(error); }));
  };
  server.events.on('request:start', capture);
  server.events.on('response:mocked', observe);
  try {
    await app.auth.login(demoAccount);
    const oldToken = app.session.getSnapshot().accessToken;
    await Promise.all([app.api.refreshSession(), app.api.refreshSession()]);
    expect(app.session.getSnapshot().accessToken).not.toBe(oldToken);
    await app.authApi.getMe();
    const workplaces = workplaceApi(app.api), cases = caseApi(app.api);
    await workplaces.list({ page: 1, size: 20 });
    await workplaces.detail(3);
    await cases.list({ page: 1, size: 20 }, 3);
    await cases.detail(15);
    const created = await workplaces.create({ name: 'Contract audit fixture' });
    await workplaces.update(created.workplaceId, { region: null });
    await workplaces.remove(created.workplaceId);
    const createdCase = await cases.create({ workplaceId: 3, payType: 'HOURLY', periodStart: '2026-01-01', periodEnd: '2026-01-31', scheduledPayDate: null });
    await cases.update(createdCase.caseId, { expectedInputVersion: createdCase.inputVersion, scheduledPayDate: null });
    await cases.remove(createdCase.caseId);
    const documents = documentApi(app.api), review = reviewApi(app.api);
    await documents.list({ kind: 'case', id: 15 }, { page: 1, size: 20 });
    await documents.detail(15, 101);
    await review.preview(3, 101);
    expect((await review.file(3, 101)).size).toBeGreaterThan(0);
    await review.fields(15, 101);
    const inputs = caseInputsApi(app.api), results = resultsApi(app.api);
    await inputs.conditions(15);
    await inputs.readiness(15);
    await results.results(15);
    await documents.recompute(15);
    await results.history(15, 'calculations', 1);
    const support = supportApi(app.api);
    await support.questions(15);
    await support.centers('서울', 'WAGE', 1);
    await support.inquiry(15);
    const receipt = await support.create(15, [], 'integration-readiness-fixture');
    let report = receipt;
    for (let i = 0; i < 3; i++) report = await support.report(15, receipt.reportId);
    expect(report.status).toBe('READY');
    await support.reports(15);
    for (const [kind, type, name] of [['pdf', 'application/pdf', 'report.pdf'], ['originals', 'application/zip', 'originals.zip']] as const) {
      const download = await app.api.requestDownload(`/cases/15/reports/${receipt.reportId}/${kind}`, type, name);
      expect(download.blob.size).toBeGreaterThan(0);
    }
    const chats = chatApi(app.api, 3);
    const chat = await chats.create('Contract audit fixture', 15);
    await chats.list(1);
    await chats.detail(chat.chatId, 1);
    const events: ChatEvent[] = [];
    await consumeChat(await chats.stream(chat.chatId, new AbortController().signal, '검증 질문'), event => events.push(event));
    expect(events[0].event).toBe('message_start');
    expect(events.at(-1)).toMatchObject({ event: 'message_done', data: { status: 'COMPLETED' } });
    await chats.detail(chat.chatId, 1);
    await chats.remove(chat.chatId);
    const currentCase = await cases.detail(15);
    const job = await results.execute(15, 'recompute', currentCase.inputVersion);
    await results.job(15, job.jobId);
    await documents.recompute(15);
    await app.auth.logout();
    await Promise.all(pending);
    expect(failures).toEqual([]);
    expect(observed.size).toBeGreaterThanOrEqual(30);
    expect(refreshRequests).toBe(1);
  } finally {
    server.events.removeListener('request:start', capture);
    server.events.removeListener('response:mocked', observe);
    await Promise.allSettled(pending);
    app.session.clear();
    app.queryClient.clear();
  }
}, 20000);
