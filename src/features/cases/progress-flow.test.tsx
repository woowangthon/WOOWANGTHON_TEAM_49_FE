// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { http } from 'msw';
import { AppServicesContext } from '@/hooks/use-app-services';
import { createAppServices } from '@/lib/app-services';
import { apiResponse, server, testApiUrl } from '@/test/server';
import { TaskNavigation } from './components/case-context';
import { useInputAction } from '@/features/case-inputs/queries';
vi.mock('next/navigation',()=>({usePathname:()=>'/cases/15/conditions'}));
let services: ReturnType<typeof createAppServices>;
beforeEach(async()=>{services=createAppServices(testApiUrl);await services.auth.login({email:'worker@example.com',password:'password1234'});});
afterEach(()=>{cleanup();services.session.clear();services.queryClient.clear();});
function Save(){const mutation=useInputAction(15);return <button onClick={()=>mutation.mutate({type:'conditions',body:{expectedInputVersion:3,answers:[{conditionId:'base_scope_confirmed',value:true}]}})}>Save</button>}
it('updates saved completion through mutation invalidation and resets on case switch',async()=>{
 let version=3;let saved=false;
 const dto={caseId:15,workplaceId:3,workplace:{name:'work'},payType:'MONTHLY',periodStart:'2026-10-01',periodEnd:'2026-10-31',scheduledPayDate:null,status:'CREATED',currentStep:'UPLOAD',documentCount:0,latestCalculationId:null,inputVersion:version,attentionRequired:false,attentionCount:0,updatedAt:'2026-11-01T00:00:00Z'};
 server.use(
 http.get(`${testApiUrl}/cases/:id`,({params})=>apiResponse({...dto,caseId:Number(params.id),inputVersion:version})),
 http.get(`${testApiUrl}/cases/:id/documents`,()=>apiResponse({items:[],total:0,page:1,size:100})),
 http.get(`${testApiUrl}/cases/:id/manual-records`,({params})=>apiResponse({items:[{recordId:1,caseId:Number(params.id),recordType:'CONTRACT',data:{},source:'USER_INPUT'}],total:1,page:1,size:20})),
 http.get(`${testApiUrl}/cases/:id/conditions`,({params})=>apiResponse({inputVersion:version,conditions:[{conditionId:'base_scope_confirmed',question:'scope',type:'BOOLEAN',options:null,requiredFor:['WAGE_CALCULATION'],value:saved&&params.id==='15'?true:null,status:saved&&params.id==='15'?'ANSWERED':'REQUIRED',source:null}]})),
 http.put(`${testApiUrl}/cases/15/conditions`,async({request})=>{expect(await request.json()).toEqual({expectedInputVersion:3,answers:[{conditionId:'base_scope_confirmed',value:true}]});saved=true;version++;return apiResponse({inputVersion:version});})
 );
 const tree=(id:number)=><AppServicesContext value={services}><QueryClientProvider client={services.queryClient}><TaskNavigation id={id}/><Save/></QueryClientProvider></AppServicesContext>;
 const ui=render(tree(15));
 await waitFor(()=>expect(screen.getByRole('link',{name:/조건 확인/}).textContent).toContain('현재 진행 단계'));
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await waitFor(()=>expect(screen.getByRole('link',{name:/조건 확인/}).textContent).toContain('완료'));
 expect(screen.getByRole('link',{name:/결과·자료 대조/}).textContent).toContain('현재 진행 단계');
 ui.rerender(tree(16));
 await waitFor(()=>expect(screen.getByRole('link',{name:/조건 확인/}).textContent).toContain('현재 진행 단계'));
 expect(screen.getByRole('link',{name:/조건 확인/}).textContent).not.toContain('완료');
});
