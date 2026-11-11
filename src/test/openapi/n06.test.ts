import {describe, expect, it} from 'vitest';
import {createOpenApiContract, decodeParameter, type Parameter, type Schema} from './contract';

const api = createOpenApiContract();
const get = (url: string) => api.request({method: 'GET', url});
const file = () => new File(['synthetic bytes'], 'sample.pdf', {type: 'application/pdf'});
const upload = (body: FormData, url = '/api/v1/cases/15/documents') => api.request({method: 'POST', url, body});
const pdf = {method: 'GET', url: '/api/v1/workplaces/3/documents/101/file'};

describe('N06 P0 query decoding', () => {
    it.each(['/api/v1/documents?workplaceId=3&documentType=PAYSLIP&page=1&size=20',
        '/api/v1/workplaces/3/chats/1?page=1&size=20', '/api/v1/documents'])('accepts %s', url => expect(get(url).valid).toBe(true));
    it.each(['workplaceId=no', 'workplaceId=null', 'documentType=INVALID', 'page=0', 'size=101', 'page=1&page=2', 'page=1,2'])('rejects %s', query => expect(get('/api/v1/documents?' + query).valid).toBe(false));
    it('requires revision and accepts only a valid serialized integer', () => {
        for (const query of ['', '?revision=wrong', '?revision=1&revision=2']) expect(api.request({method:'DELETE',url:'/api/v1/reviews/r' + query}).valid).toBe(false);
        expect(api.request({method:'DELETE',url:'/api/v1/reviews/r?revision=1'}).valid).toBe(true);
    });
    it('does not invent an additional-query prohibition', () => {
        const input = {method:'GET',url:'/api/v1/documents?processingStatus=READY'};
        expect(api.request(input)).toMatchObject({valid:true,undeclaredQuery:['processingStatus']});
        expect(api.request(input,{rejectUndeclaredQuery:true})).toMatchObject({valid:false});
    });
    it('decodes boolean and preserves string/null semantics', () => {
        expect(api.request({method:'DELETE',url:'/api/v1/workplaces/3?confirm=false'}).valid).toBe(true);
        expect(api.request({method:'DELETE',url:'/api/v1/workplaces/3?confirm=0'}).valid).toBe(false);
        expect(get('/api/v1/consultation-centers?region=null').valid).toBe(true);
    });
});

// P0 currently has no array query/style overrides. Exercise the pure decoder without
// adding invented endpoints or loading a second executable contract.
describe('N06 serialization capability boundaries', () => {
    const schema: Schema = {type:'array',items:{type:'integer'}};
    const decode = (query: string, overrides: Partial<Parameter> = {}) => decodeParameter(
        {name:'ids',in:'query',schema,...overrides}, overrides.schema ?? schema,
        new URLSearchParams(query).getAll('ids'), (s,v) => s.type === 'integer' && /^\d+$/.test(v) ? Number(v) : v);
    it('supports repeated form/explode arrays and comma form/non-explode arrays', () => {
        expect(decode('ids=1&ids=2')).toMatchObject({value:[1,2],errors:[],unsupported:[]});
        expect(decode('ids=1,2',{explode:false})).toMatchObject({value:[1,2],errors:[]});
        expect(decode('ids=1&ids=2',{explode:false}).errors).not.toHaveLength(0);
        expect(decode('ids=1,2')).toMatchObject({value:['1,2']});
    });
    it.each(['deepObject','pipeDelimited','spaceDelimited'])('explicitly reports unsupported %s', style => {
        expect(decode('ids=1',{style}).unsupported).not.toHaveLength(0);
    });
});

describe('N06 real FormData', () => {
    it('checks required file and text parts', () => {
        const body = new FormData();
        expect(upload(body).valid).toBe(false);
        body.set('documentType','PAYSLIP'); expect(upload(body).valid).toBe(false);
        body.delete('documentType'); body.set('file',file()); expect(upload(body).valid).toBe(false);
        body.set('documentType','PAYSLIP'); expect(upload(body)).toMatchObject({valid:true,unverified:['File contents: file']});
    });
    it('rejects wrong file/text types, enum, const and repeated scalars', () => {
        const body = new FormData(); body.set('file','not a file'); body.set('documentType','PAYSLIP');
        expect(upload(body).valid).toBe(false);
        body.set('file',file()); body.set('documentType',file()); expect(upload(body).valid).toBe(false);
        body.set('documentType','INVALID'); expect(upload(body).valid).toBe(false);
        body.set('documentType','PAYSLIP'); body.set('source','INVALID'); expect(upload(body).valid).toBe(false);
        body.delete('source'); body.append('documentType','PAYSLIP'); expect(upload(body).valid).toBe(false);
    });
    it('decodes nullable version and file arrays without JSON coercion', () => {
        const body = new FormData(); body.set('file',file()); body.set('expectedInputVersion','7');
        const url = '/api/v1/cases/15/documents/101/replace';
        expect(upload(body,url).valid).toBe(true);
        body.set('expectedInputVersion','no'); expect(upload(body,url).valid).toBe(false);
        const review = new FormData(); review.set('revision','1'); review.append('files',file()); review.append('files',file());
        expect(upload(review,'/api/v1/reviews/r/documents').valid).toBe(true);
        review.set('revision','0'); expect(upload(review,'/api/v1/reviews/r/documents').valid).toBe(false);
        expect(api.component('Execute',{expectedInputVersion:'7'}).valid).toBe(false);
    });
    it('uses client-generated boundary and validates the parsed wire body', async () => {
        const body = new FormData(); body.set('file',file()); body.set('documentType','PAYSLIP');
        const wire = new Request('http://contract.invalid/api/v1/cases/15/documents',{method:'POST',body});
        expect(wire.headers.get('content-type')).toMatch(/multipart\/form-data; boundary=/);
        expect(api.request({method:wire.method,url:wire.url,headers:Object.fromEntries(wire.headers),body:await wire.formData()}).valid).toBe(true);
        expect(body.get('documentType')).toBe('PAYSLIP');
    });
});

describe('N06 binary transport and explicit verification limits', () => {
    it.each(['application/pdf','image/png','image/jpeg'])('accepts declared schema-less %s', type => {
        expect(api.response(pdf,200,new Blob(['bytes'],{type}),type)).toMatchObject({valid:true,coverage:'transport-only',unverified:['Binary file contents','Binary schema absent']});
        expect(api.response(pdf,200,new ArrayBuffer(2),type).valid).toBe(true);
    });
    it('rejects wrong status, media type, string/JSON body and Blob type', () => {
        expect(api.response(pdf,201,file(),'application/pdf').valid).toBe(false);
        expect(api.response(pdf,200,file(),'text/html').valid).toBe(false);
        for (const body of ['bytes',{},undefined]) expect(api.response(pdf,200,body,'application/pdf').valid).toBe(false);
        expect(api.response(pdf,200,file(),'image/png').valid).toBe(false);
    });
    it('supports binary schemas and checks actual Response without consuming it', async () => {
        const input={method:'GET',url:'/api/v1/artifacts/1'};
        const actual=new Response(file(),{headers:{'Content-Type':'application/pdf'}});
        expect(await api.httpResponse(input,actual)).toMatchObject({valid:true,coverage:'transport-only'});
        expect(actual.bodyUsed).toBe(false);
        expect((await api.httpResponse(pdf,new Response('bad',{headers:{'Content-Type':'text/html'}}))).valid).toBe(false);
    });
    it('reports free JSON structures in component schemas', () => {
        expect(api.component('FieldDTO',{}).unverified?.length).toBeGreaterThan(0);
    });
    it('reports unsupported SSE and free envelope internals', () => {
        expect(api.response({method:'POST',url:'/api/v1/workplaces/3/chats/1/messages'},200,'event','text/event-stream')).toMatchObject({valid:false,unsupported:['Response media type/schema: text/event-stream']});
        expect(api.response({method:'GET',url:'/health'},200,{code:200,message:'ok',data:{anything:true}})).toMatchObject({valid:true,coverage:'free-json',unverified:['Envelope.data internal DTO unspecified']});
    });
    it('does not mistake absent PDF declarations for a verified PDF contract', async () => {
        const input={method:'GET',url:'/api/v1/cases/15/reports/90/pdf'};
        expect(await api.httpResponse(input,new Response(file(),{headers:{'Content-Type':'application/pdf'}}))).toMatchObject({
            valid:true,coverage:'transport-only',unverified:['Response media type/body unspecified by OpenAPI','Binary file contents']
        });
    });
});
