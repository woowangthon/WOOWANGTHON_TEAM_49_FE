import { expect,it } from 'vitest';
import { http } from 'msw';
import { apiResponse,server,testApiUrl } from '@/test/server';
import { createApiClient } from './client';
import { createMemorySession } from '@/features/auth/session';
import { caseApi } from '@/features/cases/api';
import { createAuthApi } from '@/features/auth/api/auth';
import { documentApi } from '@/features/documents/api';
const client=()=>createApiClient({baseUrl:testApiUrl,session:createMemorySession()});
it('rejects a synchronous 200 Case creation even when its DTO is otherwise valid',async()=>{
 server.use(http.post(`${testApiUrl}/cases`,()=>apiResponse({caseId:15,status:'CREATED',inputVersion:1},200)));
 await expect(caseApi(client()).create({workplaceId:3,payType:'HOURLY',periodStart:'2026-10-01',periodEnd:'2026-10-31',scheduledPayDate:null})).rejects.toMatchObject({kind:'protocol'});
});
it('requires 201 for signup instead of treating an arbitrary 2xx as completion',async()=>{
 server.use(http.post(`${testApiUrl}/auth/signup`,()=>apiResponse({},202)));
 await expect(createAuthApi(client(),testApiUrl).signup({email:'test@example.com',password:'password1234',name:'테스트'})).rejects.toMatchObject({kind:'protocol'});
});
it('requires 202 before treating an upload response as an accepted job',async()=>{
 server.use(http.post(`${testApiUrl}/cases/15/documents`,()=>apiResponse({documentId:101,processingStatus:'UPLOADED',reviewStatus:'NOT_STARTED',progress:10},200)));
 await expect(documentApi(client()).upload({kind:'case',id:15},new File(['pdf'],'test.pdf',{type:'application/pdf'}),'PAYSLIP')).rejects.toMatchObject({kind:'protocol'});
});
