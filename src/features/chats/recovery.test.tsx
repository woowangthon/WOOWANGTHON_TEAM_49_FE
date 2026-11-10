// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup,render,screen,fireEvent,within } from '@testing-library/react';
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { http } from 'msw';
import { AppServicesContext } from '@/hooks/use-app-services';
import { createAppServices } from '@/lib/app-services';
import { server,testApiUrl,apiResponse } from '@/test/server';
import { createDevelopmentScenario } from '@/mocks/development';
import { caseApi } from '@/features/cases/api';
import { ChatScreen } from './chat-screen';
import { chatApi } from './api';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()})}));
let app:ReturnType<typeof createAppServices>;
beforeEach(async()=>{
 server.use(...createDevelopmentScenario(testApiUrl).handlers);
 app=createAppServices(testApiUrl);await app.auth.login({email:'worker@example.com',password:'password1234'});
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 HTMLElement.prototype.scrollIntoView=vi.fn();
});
afterEach(()=>{cleanup();app.session.clear();app.queryClient.clear();vi.unstubAllGlobals()});
function mount(id?:number){return render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><ChatScreen workplaceId={3} chatId={id}/></QueryClientProvider></AppServicesContext>)}
it('keeps received text visible when the saved history refresh fails and offers retry',async()=>{
 const chat=await chatApi(app.api,3).create('복구 테스트',15);let failed=false;
 server.use(http.post(`${testApiUrl}/workplaces/3/chats/:id/messages`,()=>{failed=true}),http.get(`${testApiUrl}/workplaces/3/chats/:id`,()=>failed?apiResponse({errorCode:'UPSTREAM_UNAVAILABLE'},503):undefined));
 mount(chat.chatId);await screen.findByRole('heading',{name:'복구 테스트'});
 fireEvent.change(screen.getByLabelText('질문'),{target:{value:'설명'}});fireEvent.click(screen.getByRole('button',{name:'전송'}));
 expect(await screen.findByText('수신한 임시 답변입니다. 저장 기록과 완료 상태를 확인하세요.',{}, {timeout:10000})).toBeVisible();
 expect(screen.getByRole('button',{name:'임시 답변 닫기'}).closest('article')).toHaveTextContent('개발용');
 failed=false;fireEvent.click(screen.getByRole('button',{name:'대화 기록 다시 조회'}));expect(await screen.findByRole('heading',{name:'복구 테스트'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'임시 답변 닫기'}));expect(screen.queryByText('수신한 임시 답변입니다. 저장 기록과 완료 상태를 확인하세요.')).toBeNull();
},15000);
it('allows selecting a Case after the first hundred without silently keeping the prior selection',async()=>{
 const sample=(await caseApi(app.api).list({page:1,size:20},3)).items[0];
 server.use(http.get(`${testApiUrl}/workplaces/3/cases`,({request})=>{const page=Number(new URL(request.url).searchParams.get('page'));return apiResponse({items:page===1?[sample]:[{...sample,caseId:999}],page,size:100,total:101})}));
 mount();const desktop=screen.getAllByText('기본 Case').at(-1)!.closest('form')!;
 const select=within(desktop).getByRole('combobox');await within(desktop).findByRole('option',{name:`Case #${sample.caseId}`});fireEvent.change(select,{target:{value:String(sample.caseId)}});
 fireEvent.click(within(desktop).getByRole('button',{name:'다음 Case 목록'}));await within(desktop).findByRole('option',{name:'Case #999'});expect(select).toHaveValue('');expect(within(desktop).getByRole('button',{name:'다음 Case 목록'})).toBeDisabled();
});
