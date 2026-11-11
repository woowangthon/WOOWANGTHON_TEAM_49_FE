import { describe, expect, it } from 'vitest';
import { createOpenApiContract } from './contract';
const api = createOpenApiContract();
const document = { documentId: 1, workplaceId: 1, documentType: 'CONTRACT', fileName: 'a.pdf', processingStatus: 'READ_READY', reviewStatus: 'NOT_STARTED', progress: 0, linkId: null, linkedCaseIds: [], uploadedAt: 'wire string', errorCode: null, aiMetadata: null };
const field = { fieldId: 1, key: 'a', label: 'A', value: { nested: [null, 0] }, valueType: 'json', status: 'DEFERRED', editedByUser: false, effectiveValueOrigin: 'SHARED_DEFAULT', hasCaseOverride: false, confirmedAt: null, source: null };
const patch = { method: 'PATCH', url: '/api/v1/workplaces/1/payment-transactions/2' };
describe('independent P0 contracts', () => {
  it('requires declared bodies and enforces 204 body absence', () => {
    expect(api.request({ method: 'POST', url: '/api/v1/auth/signup' }).valid).toBe(false);
    const req = { method: 'POST', url: '/api/v1/auth/logout' };
    expect(api.response(req, 204)).toMatchObject({ valid: true, coverage: 'transport-only' });
    expect(api.response(req, 204, null).valid).toBe(false);
  });
  it('compiles every component including recursive refs and 2020-12 prefixItems', () => { api.compileAll(); });
  it('rejects TransactionPatch source without stripping data', () => {
    const body = { amount: 0, source: 'USER_INPUT' };
    expect(api.request({ ...patch, body }).valid).toBe(false);
    expect(body.source).toBe('USER_INPUT');
    expect(api.request({ ...patch, body: { amount: 0 } }).valid).toBe(true);
  });
  it.each([-1, 1.5, 1000000000001, '1'])('rejects amount %s', amount => expect(api.request({ ...patch, body: { amount } }).valid).toBe(false));
  it('checks inclusive maximum and nullable without confusing zero', () => {
    expect(api.component('TransactionPatch', { amount: 1000000000000 }).valid).toBe(true);
    expect(api.component('TransactionPatch', { amount: null }).valid).toBe(true);
  });
  it('accepts READ_READY and rejects missing required fields and invalid enum', () => {
    expect(api.component('DocumentDTO', document).valid).toBe(true);
    expect(api.component('DocumentDTO', { ...document, processingStatus: 'NEW' }).valid).toBe(false);
    expect(api.component('DocumentDTO', { ...document, progress: null }).valid).toBe(false);
    const missing = { ...document } as Partial<typeof document>; delete missing.linkId;
    expect(api.component('DocumentDTO', missing).valid).toBe(false);
  });
  it.each(['DEFERRED', 'NEEDS_RECONFIRMATION'])('accepts new FieldDTO state %s and structured JsonValue', status => expect(api.component('FieldDTO', { ...field, status }).valid).toBe(true));
  it('rejects invalid field status and accepts null error details/errors', () => {
    expect(api.component('FieldDTO', { ...field, status: 'NEW' }).valid).toBe(false);
    expect(api.component('ErrorData', { errorCode: 'INPUT_VERSION_CONFLICT', details: null, errors: null }).valid).toBe(true);
    expect(api.component('ErrorData', { details: null }).valid).toBe(false);
  });
  it('checks Case document linkId through response refs, without inventing nested link', () => {
    const req = { method: 'GET', url: '/api/v1/cases/1/documents' };
    const data = { items: [document], page: 1, size: 20, total: 1 };
    expect(api.response(req, 200, { code: 200, message: 'ok', data })).toMatchObject({ valid: true, coverage: 'concrete' });
    expect(api.response(req, 200, { code: 200, message: 'ok', data: { ...data, items: [{ ...document, linkId: '1' }] } }).valid).toBe(false);
    expect(api.response(req, 201, {}).valid).toBe(false);
  });
  it('labels free JSON and validates only its envelope', () => {
    const req = { method: 'GET', url: '/health' };
    for (const data of [null, 0, [], { arbitrary: true }]) expect(api.response(req, 200, { code: 200, message: 'ok', data })).toMatchObject({ valid: true, coverage: 'free-json' });
    expect(api.response(req, 200, { data: {} }).valid).toBe(false);
  });
  it('checks method, concrete path ID, query ranges, unknown query/body and media type', () => {
    expect(api.request({ method: 'GET', url: '/api/v1/documents?page=1&size=100' }).valid).toBe(true);
    for (const url of ['/api/v1/documents?page=0', '/api/v1/documents?size=101', '/api/v1/documents?processingStatus=READY', '/api/v1/document-replacements/replacement-1', '/unknown']) expect(api.request({ method: 'GET', url }).valid).toBe(false);
    expect(api.request({ method: 'TRACE', url: '/health' }).valid).toBe(false);
    expect(api.request({ method: 'GET', url: '/health', body: {} }).valid).toBe(false);
    expect(api.request({ ...patch, body: {}, contentType: 'text/plain' }).valid).toBe(false);
  });
  it('checks declared headers case insensitively', () => {
    const req = { method: 'POST', url: '/api/v1/cases/1/recompute' };
    expect(api.request({ ...req, headers: { 'idempotency-key': 'x' } }).valid).toBe(true);
    expect(api.request({ ...req, headers: { 'IDEMPOTENCY-KEY': '' } }).valid).toBe(false);
    expect(api.request({ ...req, headers: { 'Idempotency-Key': 'x'.repeat(129) } }).valid).toBe(false);
  });
  it('checks string bounds, patterns and 2020-12 tuples', () => {
    expect(api.component('Signup', { email: 'a@b.com', password: '12345678', name: 'a' }).valid).toBe(true);
    expect(api.component('Signup', { email: 'invalid', password: 'short', name: '' }).valid).toBe(false);
    const record = { record_id: 'a', start_at: '2026-01-01T00:00:00Z', end_at: '2026-01-01T01:00:00Z', evidence_refs: [], breaks: [['2026-01-01T00:00:00Z', '2026-01-01T00:10:00Z']] };
    expect(api.component('WorkRecord', record).valid).toBe(true);
    expect(api.component('WorkRecord', { ...record, breaks: [['bad']] }).valid).toBe(false);
  });
});
