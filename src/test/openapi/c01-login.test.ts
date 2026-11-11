// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server, testApiUrl } from '@/test/server';
import { clearMockSession, createDevelopmentScenario, demoAccount, demoProfile } from '@/mocks/development';
import { createAppServices } from '@/lib/app-services';
import { createOpenApiContract } from './contract';

const contract = createOpenApiContract();
const url = `${testApiUrl}/auth/login`;
const headers = { 'Content-Type': 'application/json' };
const invalid = [
  { ...demoAccount, name: demoProfile.name }, { ...demoAccount, admin: true },
  { ...demoAccount, email: 7 }, { ...demoAccount, password: null },
  { email: demoAccount.email }, { password: demoAccount.password }, {}, null, [],
];
let app: ReturnType<typeof createAppServices>;
beforeEach(() => { clearMockSession(); app = createAppServices(testApiUrl); });
afterEach(() => { app.session.clear(); app.queryClient.clear(); clearMockSession(); });

for (const mode of ['shared', 'development'] as const) describe(`C01 ${mode}`, () => {
  beforeEach(() => { if (mode === 'development') server.use(...createDevelopmentScenario(testApiUrl).handlers); });
  it('captures actual FE fetch bodies and independently validates fixtures and field projection', async () => {
    const pending: Promise<unknown>[] = [];
    const capture = ({ request }: { request: Request }) => {
      if (request.url === url && request.method === 'POST') pending.push(request.clone().json());
    };
    server.events.on('request:start', capture);
    try {
      await app.auth.login(demoAccount);
      // TypeScript structural compatibility must not leak profile fields onto the wire.
      await app.authApi.login(demoProfile);
      const bodies = await Promise.all(pending);
      expect(bodies).toHaveLength(2);
      for (const body of bodies) {
        expect(body).toEqual(demoAccount);
        expect(contract.request({ method: 'POST', url, headers, body }).valid).toBe(true);
      }
    } finally { server.events.removeListener('request:start', capture); }
  });
  it.each(invalid)('rejects invalid body %# with P0 error envelope and preserves session', async body => {
    await app.auth.login(demoAccount);
    const cookie = document.cookie;
    const before = await app.authApi.getMe();
    expect(contract.request({ method: 'POST', url, headers, body }).valid).toBe(false);
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    expect(response.status).toBe(422);
    expect((await contract.httpResponse({ method: 'POST', url, headers, body }, response.clone())).valid).toBe(true);
    expect((await response.json()).data.errorCode).toBe('VALIDATION_ERROR');
    expect(document.cookie).toBe(cookie);
    expect(await app.authApi.getMe()).toEqual(before);
  });
  it('rejects malformed JSON without creating a refresh session', async () => {
    expect((await fetch(url, { method: 'POST', headers, body: '{' })).status).toBe(422);
    if (mode === 'development') expect((await fetch(`${testApiUrl}/auth/refresh`, { method: 'POST' })).status).toBe(401);
  });
  it('does not add constraints absent from P0', async () => {
    for (const body of [{ email: '', password: '' }, { email: 'opaque', password: 'x' }]) {
      expect(contract.request({ method: 'POST', url, headers, body }).valid).toBe(true);
      expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })).status).toBe(mode === 'development' ? 401 : 200);
    }
  });
});

