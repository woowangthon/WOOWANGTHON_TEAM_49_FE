'use client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MobileNavigation } from '@/components/layout/mobile-navigation';
import { ChatMarkdown } from './markdown';
import { snapshotHref } from '@/features/results/snapshot-link';

import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSessionScope } from '@/hooks/use-session-scope';
import { useCases } from '@/features/cases/queries';
import { useSourceDocument } from '@/features/results/queries';
import { SourceEvidence } from '@/features/results/source-evidence';
import { primaryButton,secondaryButton } from '@/components/ui/styles';
import { chatApi,type Message } from './api';
import { consumeChat } from './stream';
import { Pagination } from '@/components/ui/pagination';
import { ChatContextBar, scopeLabel } from './chat-context-bar';
import type { ChatScope } from './api';
import './chat.css';
export function ChatScreen({workplaceId,chatId}:{workplaceId:number;chatId?:number}){
 const s=useSessionScope();
 return <ChatWorkspace key={`${s.generation}:${workplaceId}:${chatId}`} workplaceId={workplaceId} chatId={chatId}/>;
}
function ChatWorkspace({workplaceId:w,chatId:id}:{workplaceId:number;chatId?:number}){
 const s=useSessionScope(),api=chatApi(s.api,w),router=useRouter();
 const [page,setPage]=useState(1),[history,setHistory]=useState(1),[title,setTitle]=useState(''),[caseId,setCaseId]=useState(''),[content,setContent]=useState(''),[all,setAll]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[phase,setPhase]=useState(''),[draft,setDraft]=useState(''),[run,setRun]=useState<string>(),[mode,setMode]=useState('');
 const [confirmDelete,setConfirmDelete]=useState(false),[showLatest,setShowLatest]=useState(false);
 const pendingMessage=useRef<{signature:string;id:string}|undefined>(undefined);
 const lock=useRef(false),abort=useRef<AbortController|undefined>(undefined),viewport=useRef<HTMLDivElement>(null),follow=useRef(true);
 const prefix=['chats',s.generation,w];
 const list=useQuery({queryKey:[...prefix,'list',page],queryFn:({signal})=>api.list(page,signal),enabled:s.enabled});
 const detail=useQuery({queryKey:[...prefix,'detail',id,history],queryFn:({signal})=>api.detail(id!,history,signal),enabled:s.enabled&&!!id,staleTime:0});
 const [casePage,setCasePage]=useState(1);
 const cases=useCases(casePage,100,w);
 const conversation=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const update=()=>{const el=conversation.current;if(el)el.style.setProperty('--chat-height',`${Math.max(220,(window.visualViewport?.height??window.innerHeight)-el.getBoundingClientRect().top-24)}px`);};
  update();window.addEventListener('resize',update);window.visualViewport?.addEventListener('resize',update);
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(update):undefined;if(conversation.current?.parentElement)observer?.observe(conversation.current.parentElement);
  return()=>{window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);observer?.disconnect();};
 },[id,detail.isPending,detail.isError]);
 useEffect(()=>()=>abort.current?.abort(),[]);
 useEffect(()=>{if(follow.current&&viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;},[draft,detail.data]);
 const refresh=()=>s.queryClient.invalidateQueries({queryKey:prefix});
 async function action(fn:()=>Promise<unknown>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError(e instanceof Error?e.message:'요청 실패');}finally{lock.current=false;setBusy(false);}}
 async function send(retry?:number){
  if(!id||lock.current||(!retry&&!content.trim()))return;
  lock.current=true;setBusy(true);setError('');setDraft('');setRun(undefined);setPhase('대기');
  const ctrl=new AbortController();abort.current=ctrl;
  try{
   const signature=JSON.stringify([content,all]);
   if(!retry&&pendingMessage.current?.signature!==signature)pendingMessage.current={signature,id:crypto.randomUUID()};
   const stream=await api.stream(id,ctrl.signal,content,all?{scopeType:'WORKPLACE_ALL'}:undefined,retry,retry?undefined:pendingMessage.current?.id);
   await consumeChat(stream,event=>{
    if(ctrl.signal.aborted)return;
    if(event.event==='message_start'){pendingMessage.current=undefined;setRun(event.data.runId);setMode(event.data.aiMode??'');setPhase('스트리밍');setContent('');}
    if(event.event==='content_delta')setDraft(v=>v+event.data.delta);
    if(event.event==='message_done')setPhase(event.data.status==='COMPLETED'?'완료':event.data.status==='CANCELLED'?'취소 완료':'실패');
    if(event.event==='error'){setPhase('AI 생성 실패');setError(`${event.data.errorCode} · ${event.data.retryable?'재시도 가능':'재시도 불가'}`);}
   });
  }catch(e){if(!ctrl.signal.aborted){setPhase('실패 · 저장 상태 확인 필요');setError(e instanceof Error?e.message:'네트워크 오류');}}
  finally{if(!ctrl.signal.aborted){await refresh();if(s.queryClient.getQueryState([...prefix,'detail',id,history])?.status==='success')setDraft('');setBusy(false);lock.current=false;}}
 }
 async function cancel(){if(!id||!run)return;setPhase('취소 요청 중');try{await api.cancel(id,run);setPhase('취소 접수 · 서버 상태 확인 중');abort.current?.abort();await refresh();if(s.queryClient.getQueryState([...prefix,'detail',id,history])?.status==='success')setDraft('');setBusy(false);lock.current=false;}catch(e){setPhase('취소 실패');setError(e instanceof Error?e.message:'취소 실패');}}
 const chatList=( <div className="v2-chat-list"><h2 className="font-bold">대화 목록</h2>
 {list.isPending?<p>대화 불러오는 중</p>:list.isError?<p role="alert">대화 목록 조회 실패 <button className={secondaryButton} onClick={()=>void list.refetch()}>대화 목록 다시 조회</button></p>:list.data.items.length?list.data.items.map(c=><Link className="v2-chat-session" key={c.chatId} aria-current={id===c.chatId?"page":undefined} href={`/workplaces/${w}/chats/${c.chatId}`}><strong>{c.title}</strong><small className="block font-normal"><span className="line-clamp-2">{c.lastMessagePreview}</span><time className="block">{c.updatedAt}</time></small></Link>):<p>저장된 대화가 없습니다.</p>}
 {!!list.data?.total&&<Pagination page={page} size={20} total={list.data.total} onPage={setPage} busy={list.isFetching}/>}
 </div>);
 const startForm=( <form onSubmit={e=>{e.preventDefault();void action(async()=>{const c=await api.create(title,Number(caseId));router.push(`/workplaces/${w}/chats/${c.chatId}`);});}} className="v2-chat-start">
 <label className="block">기본 Case<select required className="ui-control " value={caseId} onChange={e=>setCaseId(e.target.value)}><option value="">Case 선택</option>{cases.data?.items.filter(c=>c.workplaceId===w).map(c=><option key={c.caseId} value={c.caseId}>Case #{c.caseId}</option>)}</select></label>
 {cases.isPending&&<p role="status">급여 사례 불러오는 중</p>}
 {cases.data?.total===0&&<p>참조할 급여 사례가 없습니다. 사례를 등록한 뒤 대화를 시작하세요.</p>}
 {cases.isError&&<p role="alert">Case 목록 조회 실패 <button type="button" onClick={()=>void cases.refetch()}>Case 목록 다시 조회</button></p>}
 {(casePage>1||(cases.data?.total??0)>100)&&<div className="flex flex-wrap items-center gap-2"><button className={secondaryButton} type="button" disabled={casePage===1||cases.isFetching} onClick={()=>{setCaseId('');setCasePage(p=>p-1);}}>이전 Case 목록</button><span>{casePage}페이지</span><button className={secondaryButton} type="button" disabled={!cases.data||cases.isFetching||casePage*100>=cases.data.total} onClick={()=>{setCaseId('');setCasePage(p=>p+1);}}>다음 Case 목록</button></div>}
 <label className="block">새 대화 제목<input className="ui-control " required minLength={1} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <button className={primaryButton} disabled={busy||!caseId||!title.trim()||cases.isError||cases.isFetching}>대화 시작</button></form>);
 return <div className="v2-chat-shell">
 <div className="v2-chat-top"><Link href={`/workplaces/${w}`}>근무지로 돌아가기</Link><span className="text-caption text-muted">근무지 #{w}</span></div>
 {!id&&<><h1 className="sr-only">AI 자료 도우미</h1><section aria-label="AI 대화 시작 안내" className="v2-chat-intro"><span aria-hidden="true" className="v2-chat-orb">✦</span><h2>이 근무지의 자료, 무엇이 궁금하세요?</h2><p>참조할 급여 사례와 제목을 정해 대화를 시작하세요.</p></section>{startForm}{chatList}<p className="v2-chat-disclaimer">AI 설명은 공식 임금 계산 결과와 구분됩니다.</p></>}
 {id&&<div className="v2-chat-header"><h1>{detail.data?.session.title??'AI 자료 도우미'}</h1><div className="v2-chat-drawer"><MobileNavigation label="채팅 목록" title="대화 목록" breakpoint="99999px"><Link className={secondaryButton} href={`/workplaces/${w}/chats`}>새 대화 시작</Link>{chatList}</MobileNavigation></div></div>}
 {error&&<p role="alert" className="v2-chat-warning">{error}</p>}
 <section className="min-w-0">
 {!id?null:detail.isPending?<p>과거 기록 불러오는 중</p>:detail.isError?<p role="alert">대화에 접근할 수 없습니다. 삭제 또는 권한과 응답 형식을 확인하세요. <button className={secondaryButton} onClick={()=>void detail.refetch()}>대화 기록 다시 조회</button></p>:<>
 <details className="v2-chat-management"><summary>대화 관리 · 제목 수정 및 삭제</summary><form onSubmit={e=>{e.preventDefault();void action(()=>api.rename(id,title));}} className="flex flex-wrap gap-2"><label>수정할 제목<input required className="ui-control " minLength={1} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label><button className={secondaryButton} disabled={busy}>제목 수정</button><button className={secondaryButton} type="button" disabled={busy} onClick={()=>setConfirmDelete(true)}>대화 삭제</button></form></details>{confirmDelete&&<ConfirmDialog title="이 대화를 삭제할까요?" busy={busy} onClose={()=>setConfirmDelete(false)} action={<button className={secondaryButton} disabled={busy} onClick={()=>void action(async()=>{await api.remove(id);s.queryClient.removeQueries({queryKey:[...prefix,'detail',id]});router.replace(`/workplaces/${w}/chats`);})}>대화 삭제 확인</button>}><p>삭제할 대화와 기록을 확인하세요.</p></ConfirmDialog>}
 <div ref={conversation} className="v2-chat-conversation">
 <ChatContextBar workplaceId={w} scope={detail.data.session.defaultScope} all={all} busy={busy} onAll={setAll}/>
 <div ref={viewport} role="region" aria-label="대화 메시지" tabIndex={0} className="v2-chat-messages" onScroll={e=>{const el=e.currentTarget;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<80;setShowLatest(!follow.current);}}>
 {detail.data.messages.total>20&&<div className="v2-chat-history"><button disabled={history===1||busy} onClick={()=>setHistory(p=>p-1)}>이전 기록</button><span>{history} / {Math.ceil(detail.data.messages.total/20)} 페이지 · 총 {detail.data.messages.total}개</span><button disabled={busy||history*20>=detail.data.messages.total} onClick={()=>setHistory(p=>p+1)}>다음 기록</button></div>}
 {detail.data.messages.items.map(m=><StoredMessage key={m.messageId} message={m} retry={()=>void send(m.messageId)} busy={busy} currentScope={all?{scopeType:'WORKPLACE_ALL'}:detail.data.session.defaultScope} returnTo={`/workplaces/${w}/chats/${id}`}/>)}
{!detail.data.messages.items.length&&!busy&&<p>아직 메시지가 없습니다. 확인할 자료나 질문을 작성하세요.</p>} {(busy||draft)&&<article className="v2-chat-bubble"><p>{phase}{mode==='mock'?' · 개발용 사전 작성 답변(mock)':''}</p><ChatMarkdown content={draft}/>{!busy&&<><p>수신한 임시 답변입니다. 저장 기록과 완료 상태를 확인하세요.</p><button className={secondaryButton} onClick={()=>setDraft('')}>임시 답변 닫기</button></>}</article>}</div>
 {showLatest&&<button className={secondaryButton} onClick={()=>{follow.current=true;setShowLatest(false);if(viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;}}>최신 메시지 보기</button>}
 <p role="status" aria-live="polite" className="sr-only">{phase}</p>
 <form onSubmit={e=>{e.preventDefault();void send();}} className="v2-chat-composer">
 <label className="sr-only" htmlFor="chat-question">질문</label><textarea id="chat-question" rows={2} placeholder="내 근무 기록과 급여에 관해 질문하세요" className="ui-control " required value={content} disabled={busy} onChange={e=>setContent(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/>
 <div className="v2-chat-footer"><small>Enter 전송 · Shift+Enter 줄바꿈</small><button className={primaryButton} disabled={busy||!content.trim()}>전송</button>{busy&&<button className={secondaryButton} type="button" disabled={!run||phase==='취소 요청 중'} onClick={()=>void cancel()}>답변 중지</button>}</div></form><p className="v2-chat-disclaimer">AI 설명은 공식 계산과 구분됩니다. 저장된 모든 대화가 모델에 전달되는 것은 아닙니다.</p></div></>}

{detail.isError&&(busy||draft)&&<article className="v2-chat-bubble"><p>{phase}{mode==='mock'?' · 개발용 사전 작성 답변(mock)':''}</p><ChatMarkdown content={draft}/>{!busy&&<><p>수신한 임시 답변입니다. 저장 기록과 완료 상태를 확인하세요.</p><button className={secondaryButton} onClick={()=>setDraft('')}>임시 답변 닫기</button></>}</article>}
 </section></div>;
}
export function StoredMessage({message:m,retry,busy,returnTo,currentScope}:{message:Message;retry:()=>void;busy:boolean;returnTo?:string;currentScope?:ChatScope}){
 const caseId=m.scope.scopeType==='CASE'?m.scope.caseId:undefined;
 const different=currentScope&&scopeLabel(currentScope)!==scopeLabel(m.scope);
 return <article aria-label={m.role==='USER'?'내 메시지':'AI 답변'} className={`v2-chat-bubble ${m.role==='USER'?'v2-chat-user':''}`}>
 <h3>{m.role==='USER'?'나':'✦ AI 자료 도우미'}</h3>
 {different&&<p className="text-caption text-muted">이 메시지 참조: {scopeLabel(m.scope)}</p>}
 {m.role==='ASSISTANT'?<ChatMarkdown content={m.content}/>:<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.content}</p>}
 {m.status!=='COMPLETED'&&<p role="status">{m.status==='FAILED'?'답변 생성 실패':m.status==='CANCELLED'?'답변 중지됨':'답변 생성 중'}</p>}
 {m.errorCode&&<p className="v2-chat-warning">{m.errorCode}</p>}
 {m.sourceMayBeOutdated&&<p role="note" className="v2-chat-warning">주의: 최신 자료와 다를 수 있는 근거입니다.</p>}
 <details className="v2-chat-evidence"><summary>{m.role==='ASSISTANT'?`출처 ${(m.sources?.length ?? "?")}건 · 공식 결과 ${(m.resultRefs?.length ?? "?")}건`:'메시지 정보'}</summary><div>
 <p>참조: {scopeLabel(m.scope)}</p><p>저장 상태: {m.status}</p>
 {m.sources===undefined&&<p>&#52636;&#52376; &#51221;&#48372; &#48120;&#51228;&#44277;</p>}
 {m.sources?.length===0&&<p>연결된 문서 출처가 없습니다.</p>}
 {(m.sources ?? []).map((source,i)=>{const c=source.caseId??caseId;return c?<ChatSource key={i} caseId={c} value={source} returnTo={returnTo}/>:<p key={i}>출처 #{source.documentId}: Case 정보가 없어 접근할 수 없습니다.</p>;})}
 {(m.resultRefs ?? []).map((r,i)=>{const c=r.caseId??caseId;return <p key={i}>{r.type} · 스냅샷 #{r.snapshotId} · v{r.version} {c&&<Link className="underline" href={snapshotHref(c,r,returnTo)}>공식 결과 스냅샷 보기</Link>}</p>;})}
 </div></details>
 {m.role==='ASSISTANT'&&['FAILED','CANCELLED'].includes(m.status)&&<button className={secondaryButton} disabled={busy} onClick={retry}>실패·취소 답변 재시도</button>}</article>;
}

function ChatSource({caseId,value,returnTo}:{caseId:number;value:NonNullable<Message['sources']>[number];returnTo?:string}){
 if(value.documentId===null)return <p>&#50896;&#48376; &#47928;&#49436; ID&#44032; &#51228;&#44277;&#46104;&#51648; &#50506;&#50520;&#49845;&#45768;&#45796;.</p>;
 return <LinkedChatSource caseId={caseId} value={{...value,documentId:value.documentId}} returnTo={returnTo}/>;
}
function LinkedChatSource({caseId,value,returnTo}:{caseId:number;value:NonNullable<Message['sources']>[number]&{documentId:number};returnTo?:string}){
 const doc=useSourceDocument(caseId,value.documentId);
 if(doc.isPending||doc.isFetching)return <p>출처 접근 확인 중</p>;
 if(doc.isError||!doc.data)return <p>삭제되었거나 접근할 수 없는 출처입니다.</p>;
 return <><SourceEvidence caseId={caseId} value={value}/>{returnTo&&<Link className="underline" href={`/cases/${caseId}/review?documentId=${value.documentId}&returnTo=${encodeURIComponent(returnTo)}`}>출처 검토 후 채팅으로 돌아가기</Link>}</>;
}
