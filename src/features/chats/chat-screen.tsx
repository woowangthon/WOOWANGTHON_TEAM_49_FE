"use client";
import {useMessageState} from '@/i18n/use-message-state';
import {message as describeMessage, errorMessage} from '@/i18n/message';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesCasesViewModels} from '@/features/cases/view-models';
import {createLocalizedFeaturesChatsApi} from './api';

import { useTranslation } from '@/i18n/use-translation';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MobileNavigation } from '@/components/layout/mobile-navigation';
import { ChatMarkdown } from './markdown';
import { WorkplaceHeader } from '@/features/workplaces/components/workplace-header';
import { useWorkplace } from '@/features/workplaces/queries';

import workplaceStyles from '@/features/workplaces/components/workplace-space.module.css';
import styles from './chat-space.module.css';
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
import {type Message} from './api';
import { consumeChat } from './stream';
import { Pagination } from '@/components/ui/pagination';
import { ChatContextBar, createChatPresentation } from './chat-context-bar';
import type { ChatScope } from './api';
import './chat.css';
export function ChatScreen({workplaceId,chatId,embeddedCaseId}:{workplaceId:number;chatId?:number;embeddedCaseId?:number}){
 const s=useSessionScope();
 return <ChatWorkspace key={`${s.generation}:${workplaceId}:${chatId}:${embeddedCaseId}`} workplaceId={workplaceId} chatId={chatId} embeddedCaseId={embeddedCaseId}/>;
}
function ChatWorkspace({workplaceId:w,chatId:initialId,embeddedCaseId}:{workplaceId:number;chatId?:number;embeddedCaseId?:number}){
const {caseCard} = useLocalized(createLocalizedFeaturesCasesViewModels);
const {chatApi} = useLocalized(createLocalizedFeaturesChatsApi);

 const {translate, locale: defaultLocale} = useTranslation();
 const {} = useLocalized(createChatPresentation);

 const [localId,setLocalId]=useState<number>();
 const id=embeddedCaseId?localId:initialId;
 const navigateChat=(chatId?:number)=>{if(busy)return;if(embeddedCaseId){setHistory(1);setContent('');setDraft('');setAll(false);setError('');setTitle('');pendingMessage.current=undefined;setLocalId(chatId);}else if(chatId)router.push(`/workplaces/${w}/chats/${chatId}`);else router.replace(`/workplaces/${w}/chats`);};
 const s=useSessionScope(),api=chatApi(s.api,w),router=useRouter();
 const [page,setPage]=useState(1),[history,setHistory]=useState(1),[title,setTitle]=useState(''),[caseId,setCaseId]=useState(embeddedCaseId?String(embeddedCaseId):''),[content,setContent]=useState(''),[all,setAll]=useState(false),[error,setError]=useMessageState(''),[busy,setBusy]=useState(false),[phase,setPhase]=useMessageState(''),[draft,setDraft]=useState(''),[run,setRun]=useState<string>(),[mode,setMode]=useState('');
 const [confirmDelete,setConfirmDelete]=useState(false),[showLatest,setShowLatest]=useState(false);
 const pendingMessage=useRef<{signature:string;id:string}|undefined>(undefined);
 const lock=useRef(false),abort=useRef<AbortController|undefined>(undefined),viewport=useRef<HTMLDivElement>(null),follow=useRef(true);
 const prefix=['chats',s.generation,w];
 const list=useQuery({queryKey:[...prefix,'list',page],queryFn:({signal})=>api.list(page,signal),enabled:s.enabled});
 const detail=useQuery({queryKey:[...prefix,'detail',id,history],queryFn:({signal})=>api.detail(id!,history,signal),enabled:s.enabled&&!!id,staleTime:0});
 const [casePage,setCasePage]=useState(1);
 const cases=useCases(casePage,100,w);
 const workplace=useWorkplace(w);
 const defaultScope=detail.data?.session.defaultScope;
 const referenceCase=cases.data?.items.find(c=>defaultScope?.scopeType==='CASE'&&c.caseId===defaultScope.caseId);
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
 async function action(fn:()=>Promise<unknown>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError(e instanceof Error?errorMessage(e):describeMessage("chats.chatScreen_request_failure"));}finally{lock.current=false;setBusy(false);}}
 async function send(retry?:number){
  if(!id||lock.current||(!retry&&!content.trim()))return;
  lock.current=true;setBusy(true);setError('');setDraft('');setRun(undefined);setPhase(describeMessage("chats.chatScreen_pending"));
  const ctrl=new AbortController();abort.current=ctrl;
  try{
   const signature=JSON.stringify([content,all]);
   if(!retry&&pendingMessage.current?.signature!==signature)pendingMessage.current={signature,id:crypto.randomUUID()};
   const stream=await api.stream(id,ctrl.signal,content,all?{scopeType:'WORKPLACE_ALL'}:undefined,retry,retry?undefined:pendingMessage.current?.id);
   await consumeChat(stream,event=>{
    if(ctrl.signal.aborted)return;
    if(event.event==='message_start'){pendingMessage.current=undefined;setRun(event.data.runId);setMode(event.data.aiMode??'');setPhase(describeMessage("chats.chatScreen_chatWorkspace_send2"));setContent('');}
    if(event.event==='content_delta')setDraft(v=>v+event.data.delta);
    if(event.event==='message_done')setPhase(event.data.status==='COMPLETED'?describeMessage("chats.chatScreen_complete"):event.data.status==='CANCELLED'?describeMessage("chats.chatScreen_cancel_complete"):describeMessage("chats.chatScreen_failure"));
    if(event.event==='error'){setPhase(describeMessage("chats.chatScreen_failure_2"));setError(describeMessage("chats.streamFailure", {code:event.data.errorCode, retry:describeMessage(event.data.retryable ? "chats.chatScreen_retry" : "chats.chatScreen_retry_2")}));}
   });
  }catch(e){if(!ctrl.signal.aborted){setPhase(describeMessage("chats.chatScreen_failure_save_status_confirm_required"));setError(e instanceof Error?errorMessage(e):describeMessage("chats.chatScreen_error"));}}
  finally{if(!ctrl.signal.aborted){await refresh();if(s.queryClient.getQueryState([...prefix,'detail',id,history])?.status==='success')setDraft('');setBusy(false);lock.current=false;}}
 }
 async function cancel(){if(!id||!run)return;setPhase(describeMessage("chats.chatScreen_cancel_request"));try{await api.cancel(id,run);setPhase(describeMessage("chats.chatScreen_cancel_count_status_confirm"));abort.current?.abort();await refresh();if(s.queryClient.getQueryState([...prefix,'detail',id,history])?.status==='success')setDraft('');setBusy(false);lock.current=false;}catch(e){setPhase(describeMessage("chats.chatScreen_cancel_failure"));setError(e instanceof Error?errorMessage(e):describeMessage("chats.chatScreen_cancel_failure"));}}
 const chatList=( <div className="v2-chat-list"><h2 className="font-bold">{translate("chats.chatScreen_chat_list")}</h2>
 {list.isPending?<p>{translate("chats.chatScreen_chat_load")}</p>:list.isError?<p role="alert">{translate("chats.chatScreen_chat_list_failure")}<button className={secondaryButton} onClick={()=>void list.refetch()}>{translate("chats.chatScreen_chat_list_retry")}</button></p>:list.data.items.length?list.data.items.filter(c=>!embeddedCaseId||(c.defaultScope.scopeType==='CASE'&&c.defaultScope.caseId===embeddedCaseId)).map(c=><Link onClick={e=>{if(embeddedCaseId){e.preventDefault();navigateChat(c.chatId);}}} className="v2-chat-session" key={c.chatId} aria-current={id===c.chatId?"page":undefined} href={`/workplaces/${w}/chats/${c.chatId}`}><strong>{c.title}</strong><small className="block font-normal"><span className="line-clamp-2">{c.lastMessagePreview}</span><time dateTime={c.updatedAt} className="block">{new Date(c.updatedAt).toLocaleDateString(defaultLocale, {year:"numeric",month:"long",day:"numeric"})}</time></small></Link>):<p>{translate("chats.chatScreen_save_chat_empty")}</p>}
 {!!list.data?.total&&<Pagination page={page} size={20} total={list.data.total} onPage={setPage} busy={list.isFetching}/>}
 </div>);
 const startForm=( <form onSubmit={e=>{e.preventDefault();void action(async()=>{const c=await api.create(title,Number(caseId));navigateChat(c.chatId);});}} className="v2-chat-start">
 <label className="block"><span className={styles.stepLabel}>{translate("chats.chatScreen_wageCase_select")}</span>{translate("chats.chatScreen_wage")}<select disabled={!!embeddedCaseId} required className="ui-control " value={caseId} onChange={e=>setCaseId(e.target.value)}>{embeddedCaseId&&<option value={embeddedCaseId}>Case #{embeddedCaseId}</option>}<option value="">{translate("chats.chatScreen_wage_period_select")}</option>{cases.data?.items.filter(c=>c.workplaceId===w&&c.caseId!==embeddedCaseId).map(c=><option key={c.caseId} value={c.caseId}>{translate("chats.chatScreen_case", { value1: caseCard(c).period, value2: caseCard(c).status, value3: c.caseId })}</option>)}</select></label>
 {cases.isPending&&<p role="status">{translate("chats.chatScreen_wageCase_load")}</p>}
 {cases.data?.total===0&&<p>{translate("chats.chatScreen_reference_wageCase_empty_case_create_chat_start")}</p>}
 {cases.isError&&<p role="alert">{translate("chats.chatScreen_wageCase_loadFailure")}<button type="button" onClick={()=>void cases.refetch()}>{translate("chats.chatScreen_wageCase_retry")}</button></p>}
 {!embeddedCaseId&&(casePage>1||(cases.data?.total??0)>100)&&<div className="flex flex-wrap items-center gap-2"><button className={secondaryButton} type="button" disabled={casePage===1||cases.isFetching} onClick={()=>{setCaseId('');setCasePage(p=>p-1);}}>{translate("chats.chatScreen_previous_case_list")}</button><span>{translate("chats.chatScreen_page", { value1: casePage })}</span><button className={secondaryButton} type="button" disabled={!cases.data||cases.isFetching||casePage*100>=cases.data.total} onClick={()=>{setCaseId('');setCasePage(p=>p+1);}}>{translate("chats.chatScreen_next_case_list")}</button></div>}
 <div hidden={!caseId} className={styles.titleStep}><span className={styles.stepLabel}>{translate("chats.chatScreen_chat")}</span><label className="block">{translate("chats.chatScreen_new_chat")}<input className="ui-control " placeholder={translate("chats.chatScreen_payslip_confirm")} minLength={1} maxLength={200} required value={title} onChange={e=>setTitle(e.target.value)}/></label></div>
 <button className={primaryButton} disabled={busy||!caseId||!title.trim()||(!embeddedCaseId&&(cases.isError||cases.isFetching))}>{translate("chats.chatScreen_chat_start")}</button></form>);
 return <div className={embeddedCaseId?"case-chat-embedded":workplaceStyles.screen}>{!embeddedCaseId&&<WorkplaceHeader id={w} workplace={workplace.data} active="chats" compact={!!id} />}<div className={`v2-chat-shell ${styles.shell}`}>
 {!id&&<><section aria-label={translate("chats.chatScreen_chat_start_notice")} className="v2-chat-intro"><span aria-hidden="true" className="v2-chat-orb">✦</span><h2>{translate("chats.chatScreen_workplace_record")}</h2><p>{translate("chats.chatScreen_wageCase_select_chat_count")}</p></section>{startForm}<div className={styles.history}>{chatList}</div><p className="v2-chat-disclaimer">{translate("chats.chatScreen_wage_calculation_result_minutes")}</p></>}
 {id&&<div className="v2-chat-header"><h1>{detail.data?.session.title??translate("chats.chatScreen_record_assistant")}</h1><div className="v2-chat-drawer"><MobileNavigation label={translate("chats.chatScreen_list")} title={translate("chats.chatScreen_chat_list")} breakpoint="99999px"><Link onClick={e=>{if(embeddedCaseId){e.preventDefault();navigateChat();}}} className={secondaryButton} href={`/workplaces/${w}/chats`}>{translate("chats.chatScreen_new_chat_start")}</Link>{chatList}</MobileNavigation></div></div>}
 {error&&<p role="alert" className="v2-chat-warning">{error}</p>}
 <section className="min-w-0">
 {!id?null:detail.isPending?<p>{translate("chats.chatScreen_load")}</p>:detail.isError?<p role="alert">{translate("chats.chatScreen_chat_access_count_empty_delete_permission_response")}<button className={secondaryButton} onClick={()=>void detail.refetch()}>{translate("chats.chatScreen_chat_retry")}</button></p>:<>
 <details className="v2-chat-management"><summary>{translate("chats.chatScreen_chat_edit_delete")}</summary><form onSubmit={e=>{e.preventDefault();void action(()=>api.rename(id,title));}} className="flex flex-wrap gap-2"><label>{translate("chats.chatScreen_edit")}<input required className="ui-control " minLength={1} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label><button className={secondaryButton} disabled={busy}>{translate("chats.chatScreen_edit_2")}</button><button className={secondaryButton} type="button" disabled={busy} onClick={()=>setConfirmDelete(true)}>{translate("chats.chatScreen_chat_delete")}</button></form></details>{confirmDelete&&<ConfirmDialog title={translate("chats.chatScreen_chat_delete_2")} busy={busy} onClose={()=>setConfirmDelete(false)} action={<button className={secondaryButton} disabled={busy} onClick={()=>void action(async()=>{await api.remove(id);s.queryClient.removeQueries({queryKey:[...prefix,'detail',id]});navigateChat();})}>{translate("chats.chatScreen_chat_delete_confirm")}</button>}><p>{translate("chats.chatScreen_delete_chat_confirm")}</p></ConfirmDialog>}
 <div ref={conversation} className="v2-chat-conversation">
 <ChatContextBar workplaceId={w} scope={detail.data.session.defaultScope} caseLabel={referenceCase ? translate("chats.chatScreen_case_2", { value1: caseCard(referenceCase).period, value2: referenceCase.caseId }) : undefined} all={all} busy={busy} onAll={setAll}/>
 <div ref={viewport} role="region" aria-label={translate("chats.chatScreen_chat_message")} tabIndex={0} className="v2-chat-messages" onScroll={e=>{const el=e.currentTarget;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<80;setShowLatest(!follow.current);}}>
 {detail.data.messages.total>20&&<div className="v2-chat-history"><button disabled={history===1||busy} onClick={()=>setHistory(p=>p-1)}>{translate("chats.chatScreen_previous")}</button><span>{translate("chats.chatScreen_page_2", { value1: history, value2: Math.ceil(detail.data.messages.total/20), value3: detail.data.messages.total })}</span><button disabled={busy||history*20>=detail.data.messages.total} onClick={()=>setHistory(p=>p+1)}>{translate("chats.chatScreen_next")}</button></div>}
 {detail.data.messages.items.map(m=><StoredMessage key={m.messageId} message={m} retry={()=>void send(m.messageId)} busy={busy} currentScope={all?{scopeType:'WORKPLACE_ALL'}:detail.data.session.defaultScope} returnTo={`/workplaces/${w}/chats/${id}`}/>)}
{!detail.data.messages.items.length&&!busy&&<p>{translate("chats.chatScreen_message_empty_confirm_record_question")}</p>} {(busy||draft)&&<article className="v2-chat-bubble"><p>{phase}{mode==='mock'?translate("chats.chatScreen_answer"):''}</p><ChatMarkdown content={draft}/>{!busy&&<><p>{translate("chats.chatScreen_count_answer_save_complete_status_confirm")}</p><button className={secondaryButton} onClick={()=>setDraft('')}>{translate("chats.chatScreen_answer_close")}</button></>}</article>}</div>
 {showLatest&&<button className={secondaryButton} onClick={()=>{follow.current=true;setShowLatest(false);if(viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;}}>{translate("chats.chatScreen_current_message")}</button>}
 <p role="status" aria-live="polite" className="sr-only">{phase}</p>
 <form onSubmit={e=>{e.preventDefault();void send();}} className="v2-chat-composer">
 <label className="sr-only" htmlFor="chat-question">{translate("chats.chatScreen_question")}</label><textarea id="chat-question" rows={2} placeholder={translate("chats.chatScreen_work_wage_question")} className="ui-control " required value={content} disabled={busy} onChange={e=>setContent(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/>
 <div className="v2-chat-footer"><small>{translate("chats.chatScreen_div14")}</small><button className={primaryButton} disabled={busy||!content.trim()}>{translate("chats.chatScreen_div15")}</button>{busy&&<button className={secondaryButton} type="button" disabled={!run||phase===translate("chats.chatScreen_cancel_request")} onClick={()=>void cancel()}>{translate("chats.chatScreen_answer_2")}</button>}</div></form><p className="v2-chat-disclaimer">{translate("chats.chatScreen_calculation_minutes_save_all_chat")}</p></div></>}

{detail.isError&&(busy||draft)&&<article className="v2-chat-bubble"><p>{phase}{mode==='mock'?translate("chats.chatScreen_answer"):''}</p><ChatMarkdown content={draft}/>{!busy&&<><p>{translate("chats.chatScreen_count_answer_save_complete_status_confirm")}</p><button className={secondaryButton} onClick={()=>setDraft('')}>{translate("chats.chatScreen_answer_close")}</button></>}</article>}
 </section></div></div>;
}
export function StoredMessage({message:m,retry,busy,returnTo,currentScope}:{message:Message;retry:()=>void;busy:boolean;returnTo?:string;currentScope?:ChatScope}){
 const {translate, translateContent} = useTranslation();
 const {scopeLabel} = useLocalized(createChatPresentation);

 const caseId=m.scope.scopeType==='CASE'?m.scope.caseId:undefined;
 const different=currentScope&&scopeLabel(currentScope)!==scopeLabel(m.scope);
 return <article aria-label={m.role==='USER'?translate("chats.chatScreen_message"):translate("chats.chatScreen_answer_3")} className={`v2-chat-bubble ${m.role==='USER'?'v2-chat-user':''}`}>
 <h3>{m.role==='USER'?translate("chats.chatScreen_h3"):translate("chats.chatScreen_record_assistant_2")}</h3>
 {different&&<p className="text-caption text-muted">{translate("chats.chatScreen_message_reference", { value1: scopeLabel(m.scope) })}</p>}
 {m.role==='ASSISTANT'?<ChatMarkdown content={m.content}/>:<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.content}</p>}
 {m.status!=='COMPLETED'&&<p role="status">{m.status==='FAILED'?translate("chats.chatScreen_answer_failure"):m.status==='CANCELLED'?translate("chats.chatScreen_answer_4"):translate("chats.chatScreen_answer_5")}</p>}
 {m.errorCode&&<p className="v2-chat-warning">{m.errorCode}</p>}
 {m.sourceMayBeOutdated&&<p role="note" className="v2-chat-warning">{translate("chats.chatScreen_warning_current_record_count_evidence")}</p>}
 <details className="v2-chat-evidence"><summary>{m.role==='ASSISTANT'?translate("chats.chatScreen_source_result", { value1: (m.sources?.length ?? "?"), value2: (m.resultRefs?.length ?? "?") }):translate("chats.chatScreen_message_information")}</summary><div>
 <p>{translate("chats.chatContextBar_reference", { value1: scopeLabel(m.scope) })}</p><p>{translate("chats.chatScreen_save_status", { value1: m.status })}</p>
 {m.sources===undefined&&<p>{translate("chats.chatScreen_source_information_notProvided")}</p>}
 {m.sources?.length===0&&<p>{translate("chats.chatScreen_link_document_source_empty")}</p>}
 {(m.sources ?? []).map((source,i)=>{const c=source.caseId??caseId;return c?<ChatSource key={i} caseId={c} value={source} returnTo={returnTo}/>:<p key={i}>{translate("chats.chatScreen_source_information_empty_access_count", { value1: source.documentId })}</p>;})}
 {(m.resultRefs ?? []).map((r,i)=>{const c=r.caseId??caseId;return <p key={i}>{translateContent("chats.chatScreen_div22", { value1: r.type, value2: r.snapshotId, value3: r.version, value4: c&&<Link className="underline" href={snapshotHref(c,r,returnTo)}>{translate("chats.chatScreen_result")}</Link> })}</p>;})}
 </div></details>
 {m.role==='ASSISTANT'&&['FAILED','CANCELLED'].includes(m.status)&&<button className={secondaryButton} disabled={busy} onClick={retry}>{translate("chats.chatScreen_failure_cancel_answer_retry")}</button>}</article>;
}

function ChatSource({caseId,value,returnTo}:{caseId:number;value:NonNullable<Message['sources']>[number];returnTo?:string}){
 const {translate} = useTranslation();
 const {} = useLocalized(createChatPresentation);

 if(value.documentId===null)return <p>{translate("chats.chatScreen_original_document_notProvided")}</p>;
 return <LinkedChatSource caseId={caseId} value={{...value,documentId:value.documentId}} returnTo={returnTo}/>;
}
function LinkedChatSource({caseId,value,returnTo}:{caseId:number;value:NonNullable<Message['sources']>[number]&{documentId:number};returnTo?:string}){
 const {translate} = useTranslation();
 const {} = useLocalized(createChatPresentation);

 const doc=useSourceDocument(caseId,value.documentId);
 if(doc.isPending||doc.isFetching)return <p>{translate("chats.chatScreen_source_access_confirm")}</p>;
 if(doc.isError||!doc.data)return <p>{translate("chats.chatScreen_delete_access_count_none_source")}</p>;
 return <><SourceEvidence caseId={caseId} value={value}/>{returnTo&&<Link className="underline" href={`/cases/${caseId}/review?documentId=${value.documentId}&returnTo=${encodeURIComponent(returnTo)}`}>{translate("chats.chatScreen_source_review")}</Link>}</>;
}
