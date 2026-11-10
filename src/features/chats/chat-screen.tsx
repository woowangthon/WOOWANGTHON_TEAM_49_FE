'use client';
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
import { secondaryButton,cardStyle } from '@/components/ui/styles';
import { chatApi,type Message } from './api';
import { consumeChat } from './stream';
export function ChatScreen({workplaceId,chatId}:{workplaceId:number;chatId?:number}){
 const s=useSessionScope();
 return <ChatWorkspace key={`${s.generation}:${workplaceId}:${chatId}`} workplaceId={workplaceId} chatId={chatId}/>;
}
function ChatWorkspace({workplaceId:w,chatId:id}:{workplaceId:number;chatId?:number}){
 const s=useSessionScope(),api=chatApi(s.api,w),router=useRouter();
 const [page,setPage]=useState(1),[history,setHistory]=useState(1),[title,setTitle]=useState(''),[caseId,setCaseId]=useState(''),[content,setContent]=useState(''),[all,setAll]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[phase,setPhase]=useState(''),[draft,setDraft]=useState(''),[run,setRun]=useState<string>(),[mode,setMode]=useState('');
 const lock=useRef(false),abort=useRef<AbortController|undefined>(undefined),bottom=useRef<HTMLDivElement>(null),follow=useRef(true);
 const prefix=['chats',s.generation,w];
 const list=useQuery({queryKey:[...prefix,'list',page],queryFn:({signal})=>api.list(page,signal),enabled:s.enabled});
 const detail=useQuery({queryKey:[...prefix,'detail',id,history],queryFn:({signal})=>api.detail(id!,history,signal),enabled:s.enabled&&!!id,staleTime:0});
 const cases=useCases(1,100,w);
 useEffect(()=>()=>abort.current?.abort(),[]);
 useEffect(()=>{if(follow.current)bottom.current?.scrollIntoView({block:'nearest'});},[draft]);
 const refresh=()=>s.queryClient.invalidateQueries({queryKey:prefix});
 async function action(fn:()=>Promise<unknown>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError(e instanceof Error?e.message:'요청 실패');}finally{lock.current=false;setBusy(false);}}
 async function send(retry?:number){
  if(!id||lock.current||(!retry&&!content.trim()))return;
  lock.current=true;setBusy(true);setError('');setDraft('');setRun(undefined);setPhase('대기');
  const ctrl=new AbortController();abort.current=ctrl;
  try{
   const stream=await api.stream(id,ctrl.signal,content,all?{scopeType:'WORKPLACE_ALL'}:undefined,retry);
   await consumeChat(stream,event=>{
    if(ctrl.signal.aborted)return;
    if(event.event==='message_start'){setRun(event.data.runId);setMode(event.data.aiMode??'');setPhase('스트리밍');setContent('');}
    if(event.event==='content_delta')setDraft(v=>v+event.data.delta);
    if(event.event==='message_done')setPhase(event.data.status==='COMPLETED'?'완료':event.data.status==='CANCELLED'?'취소 완료':'실패');
    if(event.event==='error'){setPhase('AI 생성 실패');setError(`${event.data.errorCode} · ${event.data.retryable?'재시도 가능':'재시도 불가'}`);}
   });
  }catch(e){if(!ctrl.signal.aborted){setPhase('실패 · 저장 상태 확인 필요');setError(e instanceof Error?e.message:'네트워크 오류');}}
  finally{if(!ctrl.signal.aborted){await refresh();setDraft('');setBusy(false);lock.current=false;}}
 }
 async function cancel(){if(!id||!run)return;setPhase('취소 요청 중');try{await api.cancel(id,run);setPhase('취소 접수 · 서버 상태 확인 중');abort.current?.abort();await refresh();setDraft('');setBusy(false);lock.current=false;}catch(e){setPhase('취소 실패');setError(e instanceof Error?e.message:'취소 실패');}}
 const chatList=( <div className={`${cardStyle} min-w-0 space-y-3`}><h2 className="font-bold">대화 목록</h2>
 {list.isPending?<p>대화 불러오는 중</p>:list.isError?<p role="alert">대화 목록 조회 실패</p>:list.data.items.length?list.data.items.map(c=><Link className="block rounded border p-2 aria-[current=page]:bg-neutral-soft aria-[current=page]:font-bold" key={c.chatId} aria-current={id===c.chatId?"page":undefined} href={`/workplaces/${w}/chats/${c.chatId}`}>{c.title}<small className="block">{c.lastMessagePreview}<br/>{c.updatedAt}</small></Link>):<p>저장된 대화가 없습니다.</p>}
 <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>이전 목록</button><button disabled={!list.data||page*20>=list.data.total} onClick={()=>setPage(p=>p+1)}>다음 목록</button>
 <form onSubmit={e=>{e.preventDefault();void action(async()=>{const c=await api.create(title,Number(caseId));router.push(`/workplaces/${w}/chats/${c.chatId}`);});}} className="space-y-2">
 <label className="block">새 대화 제목<input className="w-full border p-2" required value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label className="block">기본 Case<select required className="w-full border p-2" value={caseId} onChange={e=>setCaseId(e.target.value)}><option value="">Case 선택</option>{cases.data?.items.filter(c=>c.workplaceId===w).map(c=><option key={c.caseId} value={c.caseId}>Case #{c.caseId}</option>)}</select></label>
 <button className={secondaryButton} disabled={busy||!caseId}>새 채팅</button></form></div>);
 return <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">
 <Link href={`/workplaces/${w}`} className="underline">근무지로 돌아가기</Link><h1 className="text-2xl font-bold">AI 자료 도우미</h1>
 <p>AI 설명은 공식 임금 계산 결과와 구분됩니다. 저장된 모든 과거 대화가 모델에 전달된다는 의미는 아닙니다.</p>
 <MobileNavigation label="채팅 목록" title="대화 목록">{chatList}</MobileNavigation>
 {error&&<p role="alert">{error}</p>}
 <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
 <div className="hidden lg:block">{chatList}</div>
 <section className="min-w-0 space-y-4">
 {!id?<p>Case를 선택하고 새 대화를 시작하거나 기존 대화를 선택하세요.</p>:detail.isPending?<p>과거 기록 불러오는 중</p>:detail.isError?<p role="alert">대화에 접근할 수 없습니다. 삭제 또는 권한과 응답 형식을 확인하세요.</p>:<>
 <h2 className="font-bold">{detail.data.session.title}</h2>
 <form onSubmit={e=>{e.preventDefault();void action(()=>api.rename(id,title));}} className="flex flex-wrap gap-2"><label>수정할 제목<input required className="w-full border" value={title} onChange={e=>setTitle(e.target.value)}/></label><button disabled={busy} className={secondaryButton}>제목 수정</button><button type="button" disabled={busy} onClick={()=>{if(window.confirm('이 대화를 삭제할까요?'))void action(async()=>{await api.remove(id);s.queryClient.removeQueries({queryKey:[...prefix,'detail',id]});router.replace(`/workplaces/${w}/chats`);});}}>대화 삭제</button></form>
 <div className="max-h-[60vh] min-w-0 space-y-4 overflow-y-auto" onScroll={e=>{const el=e.currentTarget;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<80;}}>
 {detail.data.messages.items.map(m=><StoredMessage key={m.messageId} message={m} retry={()=>void send(m.messageId)} busy={busy} returnTo={`/workplaces/${w}/chats/${id}`}/>)}
 {busy&&<article className={cardStyle}><p>{phase}{mode==='mock'?' · 개발용 사전 작성 답변(mock)':''}</p><ChatMarkdown content={draft}/></article>}<div ref={bottom}/></div>
 <button disabled={history===1||busy} onClick={()=>setHistory(p=>p-1)}>이전 기록</button><button disabled={busy||history*20>=detail.data.messages.total} onClick={()=>setHistory(p=>p+1)}>다음 기록</button>
 <p role="status" aria-live="polite">{phase}</p>
 <form onSubmit={e=>{e.preventDefault();void send();}} className="space-y-2">
 <label className="block"><input type="checkbox" disabled={busy} checked={all} onChange={e=>setAll(e.target.checked)}/> 근무지 전체 참조</label><p>{all?'현재 근무지의 모든 Case로 참조 범위가 넓어집니다.':`기본 범위: ${detail.data.session.defaultScope.scopeType==='CASE'?`Case #${detail.data.session.defaultScope.caseId}`:'근무지 전체 (서버 기본값)'}`}</p>
 <label className="block" htmlFor="chat-question">질문</label><textarea id="chat-question" className="w-full min-w-0 rounded border p-3" required value={content} disabled={busy} onChange={e=>setContent(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/>
 <button className={secondaryButton} disabled={busy||!content.trim()}>전송</button>{busy&&<button type="button" disabled={!run||phase==='취소 요청 중'} onClick={()=>void cancel()}>답변 중지</button>}</form></>}
 </section></div></div>;
}
export function StoredMessage({message:m,retry,busy,returnTo}:{message:Message;retry:()=>void;busy:boolean;returnTo?:string}){
 const caseId=m.scope.scopeType==='CASE'?m.scope.caseId:undefined;
 return <article className={`${cardStyle} min-w-0 space-y-2`}><h3>{m.role==='USER'?'나':'AI 자료 도우미'} · {m.status}</h3><p>참조: {caseId?`Case #${caseId}`:'근무지 전체'}</p><>{m.role==='ASSISTANT'?<ChatMarkdown content={m.content}/>:<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.content}</p>}</>{m.errorCode&&<p>{m.errorCode}</p>}{m.sourceMayBeOutdated&&<p role="note">주의: 최신 자료와 다를 수 있는 근거입니다.</p>}
 {m.sources.map((source,i)=>{const c=source.caseId??caseId;return c?<ChatSource key={i} caseId={c} value={source} returnTo={returnTo}/>:<p key={i}>출처 #{source.documentId}: Case 정보가 없어 접근할 수 없습니다.</p>;})}
 {m.resultRefs.map((r,i)=>{const c=r.caseId??caseId;return <p key={i}>{r.type} · 스냅샷 #{r.snapshotId} · v{r.version} {c&&<Link className="underline" href={snapshotHref(c,r,returnTo)}>공식 결과 스냅샷 보기</Link>}</p>;})}
 {m.role==='ASSISTANT'&&['FAILED','CANCELLED'].includes(m.status)&&<button className={secondaryButton} disabled={busy} onClick={retry}>실패·취소 답변 재시도</button>}</article>;
}

function ChatSource({caseId,value,returnTo}:{caseId:number;value:Message['sources'][number];returnTo?:string}){
 const doc=useSourceDocument(caseId,value.documentId);
 if(doc.isPending||doc.isFetching)return <p>출처 접근 확인 중</p>;
 if(doc.isError||!doc.data)return <p>삭제되었거나 접근할 수 없는 출처입니다.</p>;
 return <><SourceEvidence caseId={caseId} value={value}/>{returnTo&&<Link className="underline" href={`/cases/${caseId}/review?documentId=${value.documentId}&returnTo=${encodeURIComponent(returnTo)}`}>출처 검토 후 채팅으로 돌아가기</Link>}</>;
}
