// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup,render,screen,fireEvent,within,waitFor } from '@testing-library/react';
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
import { CaseChat } from './case-chat';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()})}));
let app:ReturnType<typeof createAppServices>;
beforeEach(async()=>{
 server.use(...createDevelopmentScenario(testApiUrl).handlers);
 app=createAppServices(testApiUrl);await app.auth.login({email:'worker@example.com',password:'password1234'});
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 HTMLElement.prototype.scrollIntoView=vi.fn();
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
});
afterEach(()=>{cleanup();app.session.clear();app.queryClient.clear();vi.unstubAllGlobals()});
function mount(id?:number){return render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><ChatScreen workplaceId={3} chatId={id}/></QueryClientProvider></AppServicesContext>)}
it('keeps a scoped floating conversation across close and reopen and clears it on session change',async()=>{
 render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><CaseChat caseId={15}/></QueryClientProvider></AppServicesContext>);
 const trigger=await screen.findByRole('button',{name:'AI 자료 도우미 열기'});
 fireEvent.click(trigger);
 expect(screen.getByRole('combobox')).toHaveValue('15');
 expect(screen.getByRole('combobox')).toBeDisabled();
 expect(screen.queryByRole('navigation',{name:'근무지 화면'})).toBeNull();
 fireEvent.change(screen.getByLabelText('새 대화 제목'),{target:{value:'사례 질문'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'대화 시작'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'대화 시작'}));
 await screen.findByRole('heading',{name:'사례 질문'});
 fireEvent.change(screen.getByLabelText('질문'),{target:{value:'유지할 질문'}});
 fireEvent.click(screen.getByRole('button',{name:'AI 자료 도우미 닫기'}));
 expect(document.activeElement).toBe(trigger);
 fireEvent.click(trigger);
 expect(screen.getByLabelText('질문')).toHaveValue('유지할 질문');
 fireEvent.submit(screen.getByLabelText('질문').closest('form')!);
 expect(await screen.findByText('유지할 질문')).toBeVisible();
 await waitFor(()=>expect(screen.getByRole('button',{name:'전송'})).toBeDisabled());
 fireEvent(screen.getByRole('dialog',{name:'현재 급여 사례 AI 자료 도우미'}),new Event('cancel',{cancelable:true}));
 expect(trigger).toHaveAttribute('aria-expanded','false');
 app.session.clear();
 await waitFor(()=>expect(screen.queryByRole('button',{name:'AI 자료 도우미 열기'})).toBeNull());
});
it('explains how to start a scoped conversation without inventing messages',async()=>{
 mount();expect(screen.getByRole('region',{name:'AI 대화 시작 안내'})).toBeVisible();
 expect(screen.getByRole('heading',{name:'이 근무지의 자료, 무엇이 궁금하세요?'})).toBeVisible();
 expect(screen.getByText('급여 내역을 선택하면, 그 기록을 바탕으로 대화할 수 있어요.')).toBeVisible();
 expect(screen.queryByRole('region',{name:'대화 메시지'})).toBeNull();
 await screen.findAllByRole('option',{name:/내역 #15$/});
 expect(screen.getByLabelText('새 대화 제목')).not.toBeVisible();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'15'}});
 expect(screen.getByLabelText('새 대화 제목')).toBeVisible();
 expect(screen.getByLabelText('새 대화 제목')).toHaveAttribute('minlength','1');
 expect(screen.getByLabelText('새 대화 제목')).toHaveAttribute('maxlength','200');
 fireEvent.change(screen.getByLabelText('새 대화 제목'),{target:{value:'유지할 제목'}});
 fireEvent.change(screen.getByRole('combobox'),{target:{value:''}});
 expect(screen.getByLabelText('새 대화 제목')).not.toBeVisible();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'15'}});
 expect(screen.getByLabelText('새 대화 제목')).toHaveValue('유지할 제목');
});
it('replaces the floating context and draft when moving to another Case',async()=>{
 const content=(id:number)=><AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><CaseChat caseId={id}/></QueryClientProvider></AppServicesContext>;
 const view=render(content(15));
 fireEvent.click(await screen.findByRole('button',{name:'AI 자료 도우미 열기'}));
 fireEvent.change(screen.getByLabelText('새 대화 제목'),{target:{value:'이전 사례 초안'}});
 view.rerender(content(16));
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'현재 급여 사례 AI 자료 도우미'})).toBeNull());
 fireEvent.click(await screen.findByRole('button',{name:'AI 자료 도우미 열기'}));
 expect(screen.getByRole('combobox')).toHaveValue('16');
 expect(screen.getByLabelText('새 대화 제목')).toHaveValue('');
});
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
 mount();const desktop=screen.getByRole('combobox').closest('form')!;
 const select=within(desktop).getByRole('combobox');await within(desktop).findByRole('option',{name:new RegExp('내역 #'+sample.caseId+'$')});fireEvent.change(select,{target:{value:String(sample.caseId)}});
 fireEvent.click(within(desktop).getByRole('button',{name:'다음 내역 목록'}));await within(desktop).findByRole('option',{name:/내역 #999$/});expect(select).toHaveValue('');expect(within(desktop).getByRole('button',{name:'다음 내역 목록'})).toBeDisabled();
});
it('preserves the question draft through history disclosure and IME Enter',async()=>{
 const chat=await chatApi(app.api,3).create('입력 보존',15);mount(chat.chatId);await screen.findByRole('heading',{name:'입력 보존'});
 const input=screen.getByLabelText('질문');fireEvent.change(input,{target:{value:'작성 중인 질문'}});
 fireEvent.click(screen.getByText('대화 관리 · 제목 수정 및 삭제'));expect(input).toHaveValue('작성 중인 질문');
 fireEvent.keyDown(input,{key:'Enter',isComposing:true});expect(input).toHaveValue('작성 중인 질문');expect(screen.getByRole('button',{name:'전송'})).toBeEnabled();
 expect(screen.getByText('아직 메시지가 없습니다. 확인할 자료나 질문을 작성하세요.')).toBeVisible();
});
it('keeps long history previews compact without truncating stored source text',async()=>{
 const api=chatApi(app.api,3);const chat=await api.create('긴 미리보기',15);const list=await api.list(1);list.items.find(c=>c.chatId===chat.chatId)!.lastMessagePreview='긴 답변 '.repeat(300);
 server.use(http.get(`${testApiUrl}/workplaces/3/chats`,()=>apiResponse(list)));mount(chat.chatId);await screen.findByRole('heading',{name:'긴 미리보기'});
 const previews=await screen.findAllByText(('긴 답변 '.repeat(300)).trim());expect(previews.every(e=>e.classList.contains('line-clamp-2'))).toBe(true);
});

it('pages 21 saved conversations using the server and keeps the creation draft',async()=>{
 const api=chatApi(app.api,3);for(let i=1;i<=21;i++)await api.create(`대화 ${i}`,15);
 mount();await screen.findByRole('link',{name:/대화 20/});
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'15'}});
 fireEvent.change(screen.getByLabelText('새 대화 제목'),{target:{value:'보존할 제목'}});
 fireEvent.click(screen.getByRole('button',{name:'다음'}));
 await screen.findByRole('link',{name:/대화 21/});expect(screen.queryByRole('link',{name:/대화 1 /})).toBeNull();
 expect(screen.getByLabelText('새 대화 제목')).toHaveValue('보존할 제목');
 expect(screen.getByText('2 / 2 페이지 · 총 21개')).toBeVisible();
});

it('keeps SSE running through disclosures, locks scope, and restores saved messages',async()=>{
 const api=chatApi(app.api,3),chat=await api.create('펼침 중 스트림',15);mount(chat.chatId);
 await screen.findByRole('heading',{name:'펼침 중 스트림'});
 const input=screen.getByLabelText('질문');fireEvent.change(input,{target:{value:'설명'}});fireEvent.keyDown(input,{key:'Enter',shiftKey:true});expect(input).toHaveValue('설명');
 fireEvent.click(screen.getByText('참조 범위 변경'));fireEvent.click(screen.getByLabelText('근무지 전체 참조'));
 fireEvent.click(screen.getByRole('button',{name:'전송'}));await screen.findByRole('button',{name:'답변 중지'});
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('\uB2F5\uBCC0 \uC0DD\uC131 \uC911'));
 expect(screen.getByLabelText('\uADFC\uBB34\uC9C0 \uC804\uCCB4 \uCC38\uC870')).toBeDisabled();
 fireEvent.click(screen.getByText('대화 관리 · 제목 수정 및 삭제'));fireEvent.click(screen.getByText('참조 범위 변경'));
 await waitFor(()=>expect(input).toBeEnabled(),{timeout:10000});
 expect(screen.getByRole('status')).not.toHaveTextContent('\uB2F5\uBCC0 \uC0DD\uC131 \uC911');
 const saved=await api.detail(chat.chatId,1);expect(saved.messages.total).toBe(2);expect(saved.messages.items.every(m=>m.scope.scopeType==='WORKPLACE_ALL')).toBe(true);
 expect(screen.getByRole('article',{name:'AI 답변'})).toHaveTextContent('개발용');
},15000);

it('keeps the creation form and explains Case lookup failures',async()=>{
 server.use(http.get(`${testApiUrl}/workplaces/3/cases`,()=>apiResponse({errorCode:'UPSTREAM_UNAVAILABLE'},503)));
 mount();await screen.findByRole('button',{name:'급여 내역 다시 조회'});
 expect(screen.getByLabelText('새 대화 제목')).not.toBeVisible();
 expect(screen.getByRole('button',{name:'대화 시작'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'급여 내역 다시 조회'}));
 expect(screen.getByRole('combobox')).toHaveValue('');
});

it('preserves required creation inputs after a server error and allows retry',async()=>{
 let fail=true;server.use(http.post(`${testApiUrl}/workplaces/3/chats`,()=>fail?apiResponse({errorCode:'UPSTREAM_UNAVAILABLE'},503):undefined));
 mount();await screen.findByRole('option',{name:/내역 #15$/});
 const button=screen.getByRole('button',{name:'대화 시작'});expect(button).toBeDisabled();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'15'}});
 fireEvent.change(screen.getByLabelText('새 대화 제목'),{target:{value:'생성 재시도'}});fireEvent.click(button);
 await screen.findByRole('alert');await waitFor(()=>expect(button).toBeEnabled());
 expect(screen.getByLabelText('새 대화 제목')).toHaveValue('생성 재시도');expect(screen.getByRole('combobox')).toHaveValue('15');
 fail=false;fireEvent.click(button);await waitFor(()=>expect(button).toBeEnabled());
 expect((await chatApi(app.api,3).list(1)).items[0].title).toBe('생성 재시도');
});

it('uses server history pages without sending or discarding the composer draft',async()=>{
 const api=chatApi(app.api,3),chat=await api.create('21개 기록',15),detail=await api.detail(chat.chatId,1);
 const pages:number[]=[];server.use(http.get(`${testApiUrl}/workplaces/3/chats/${chat.chatId}`,({request})=>{
  const page=Number(new URL(request.url).searchParams.get('page'));pages.push(page);
  return apiResponse({...detail,messages:{page,size:20,total:21,items:[{messageId:page,role:'USER',content:`기록 페이지 ${page}`,status:'COMPLETED',scope:{scopeType:'CASE',caseId:15},sources:[],resultRefs:[],runId:null,errorCode:null,sourceMayBeOutdated:false}]}});
 }));
 mount(chat.chatId);await screen.findByText('기록 페이지 1');fireEvent.change(screen.getByLabelText('질문'),{target:{value:'미전송 초안'}});
 fireEvent.click(screen.getByRole('button',{name:'다음 기록'}));await screen.findByText('기록 페이지 2');expect(screen.getByLabelText('질문')).toHaveValue('미전송 초안');expect(screen.getByRole('button',{name:'다음 기록'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'이전 기록'}));await screen.findByText('기록 페이지 1');expect(pages).toEqual([1,2,1]);expect(screen.getByLabelText('질문')).toHaveValue('미전송 초안');
});

it('V06 retains a client message ID across pre-start failures and renews it for edited content',async()=>{
 const chat=await chatApi(app.api,3).create('Resend key',15);const bodies:{content:string;clientMessageId:string}[]=[];
 server.use(http.post(`${testApiUrl}/workplaces/3/chats/:id/messages`,async({request})=>{bodies.push(await request.json() as typeof bodies[number]);return apiResponse({errorCode:'UPSTREAM_UNAVAILABLE'},503);}));
 mount(chat.chatId);await screen.findByRole('heading',{name:'Resend key'});
 const input=screen.getByLabelText('질문');fireEvent.change(input,{target:{value:'question'}});
 for(let i=1;i<=2;i++){fireEvent.click(screen.getByRole('button',{name:'전송'}));await waitFor(()=>expect(bodies).toHaveLength(i));await waitFor(()=>expect(screen.getByRole('button',{name:'전송'})).toBeEnabled());}
 expect(bodies[0].clientMessageId).toBeTruthy();expect(bodies[1].clientMessageId).toBe(bodies[0].clientMessageId);
 fireEvent.change(input,{target:{value:'edited question'}});fireEvent.click(screen.getByRole('button',{name:'전송'}));await waitFor(()=>expect(bodies).toHaveLength(3));expect(bodies[2].clientMessageId).not.toBe(bodies[0].clientMessageId);
});
