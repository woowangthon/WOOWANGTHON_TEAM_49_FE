import { http,HttpResponse } from 'msw';
import { apiResponse } from './response';
import { scopeSchema,type Message } from '@/features/chats/api';
type Case={caseId:number;workplaceId:number};
export function chatMocks(base:string,getCases:()=>Case[]){
 let seq=100;
 const chats=new Map<number,{chatId:number;workplaceId:number;title:string;defaultScope:Message['scope'];updatedAt:string;lastMessagePreview:string;messages:Message[]}>();
 const active=new Map<number,{runId:string;message:Message;cancelled:boolean}>();
 const root=`${base}/workplaces/:w/chats`;
 const fail=(errorCode:string,status:number)=>apiResponse({errorCode},status);
 const find=(w:unknown,c:unknown)=>{const chat=chats.get(Number(c));return chat?.workplaceId===Number(w)?chat:undefined;};
 const page=(items:unknown[],request:Request)=>{const q=new URL(request.url).searchParams,p=Math.max(1,Number(q.get('page')??1)),size=20;return {items:items.slice((p-1)*size,p*size),page:p,size,total:items.length};};
 const summary=(c:NonNullable<ReturnType<typeof find>>)=>{const {messages,...rest}=c;return {...rest,messageCount:messages.length};};
 async function execute(w:unknown,c:unknown,request:Request,retry?:number){
  const chat=find(w,c);if(!chat)return fail('RESOURCE_NOT_FOUND',404);
  if(active.has(chat.chatId))return fail('CHAT_RUN_ALREADY_ACTIVE',409);
  const previous=retry?chat.messages.find(m=>m.messageId===retry&&m.role==='ASSISTANT'):undefined;
  if(retry&&(!previous||!['FAILED','CANCELLED'].includes(previous.status)))return fail('MESSAGE_NOT_RETRYABLE',409);
  const body=retry?{content:chat.messages.filter(m=>m.role==='USER').at(-1)?.content??'',scope:previous!.scope}:await request.json() as {content:string;scope?:unknown};
  if(!body.content?.trim())return fail('VALIDATION_ERROR',422);
  if(body.content==='JSON 오류')return fail('CHAT_RUN_ALREADY_ACTIVE',409);
  const scope=scopeSchema.safeParse(body.scope??chat.defaultScope);if(!scope.success)return fail('VALIDATION_ERROR',422);
  if(scope.data.scopeType==='CASE'&&!getCases().some(v=>v.caseId===(scope.data as {caseId:number}).caseId&&v.workplaceId===chat.workplaceId))return fail('RESOURCE_NOT_FOUND',404);
  const message=(role:Message['role']):Message=>({messageId:++seq,role,content:'',status:'COMPLETED',scope:scope.data,sources:[],resultRefs:[],sourceMayBeOutdated:false,runId:null,errorCode:null});
  if(!retry)chat.messages.push({...message('USER'),content:body.content});
  const answer=message('ASSISTANT');answer.status='STREAMING';answer.runId=`run-${++seq}`;chat.messages.push(answer);
  const run={runId:answer.runId,message:answer,cancelled:false};active.set(chat.chatId,run);
  return new HttpResponse(new ReadableStream<Uint8Array>({async start(controller){
   const enc=new TextEncoder();let connected=true;
   const emit=(event:string,data:unknown)=>{if(!connected)return;try{const bytes=enc.encode(`event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`);for(let i=0;i<bytes.length;i+=7)controller.enqueue(bytes.slice(i,i+7));}catch{connected=false;}};
   const identity={runId:run.runId,messageId:answer.messageId};
   try{
    emit('message_start',{...identity,role:'ASSISTANT',scope:answer.scope,aiMode:'mock'});
    const text='개발용 사전 작성 답변입니다. 자료가 부족해 임금 차이를 확정할 수 없습니다. 공식 결과와 확인된 자료를 검토해 주세요.\n\n- AI 설명은 공식 계산이 아닙니다.\n- 문서 확인이 필요합니다.';
    for(let i=0;i<text.length;i+=5){await new Promise(r=>setTimeout(r,40));if(run.cancelled)break;answer.content+=text.slice(i,i+5);emit('content_delta',{delta:text.slice(i,i+5)});
     if(body.content==='생성 실패'&&i>15){answer.status='FAILED';answer.errorCode='AI_GENERATION_FAILED';emit('error',{...identity,errorCode:answer.errorCode,retryable:true});return;}
     if(body.content==='연결 중단'&&i>15){answer.status='FAILED';answer.errorCode='STREAM_INTERRUPTED';return;}
    }
    if(!run.cancelled){answer.sources=answer.scope.scopeType==='CASE'?[{documentId:body.content==='삭제 출처'?99999:101,page:1,caseId:answer.scope.caseId}]:[];emit('sources',{sources:answer.sources,resultRefs:[]});}
    answer.status=run.cancelled?'CANCELLED':'COMPLETED';emit('message_done',{...identity,status:answer.status});
   }finally{chat.updatedAt=new Date().toISOString();chat.lastMessagePreview=answer.content;active.delete(chat.chatId);try{controller.close();}catch{connected=false;}}
  }}),{headers:{'Content-Type':'text/event-stream'}});
 }
 return {chats,handlers:[
 http.get(root,({params,request})=>apiResponse(page([...chats.values()].filter(c=>c.workplaceId===Number(params.w)).map(summary),request))),
 http.post(root,async({params,request})=>{const b=await request.json() as {title:string;defaultScope:unknown};const scope=scopeSchema.safeParse(b.defaultScope);if(!b.title?.trim()||!scope.success||scope.data.scopeType!=='CASE')return fail('VALIDATION_ERROR',422);const caseId=scope.data.caseId;if(!getCases().some(c=>c.workplaceId===Number(params.w)&&c.caseId===caseId))return fail('RESOURCE_NOT_FOUND',404);const c={chatId:++seq,workplaceId:Number(params.w),title:b.title,defaultScope:scope.data,updatedAt:new Date().toISOString(),lastMessagePreview:'',messages:[]};chats.set(c.chatId,c);return apiResponse(summary(c),201);}),
 http.get(`${root}/:c`,({params,request})=>{const c=find(params.w,params.c);return c?apiResponse({session:summary(c),messages:page(c.messages,request)}):fail('RESOURCE_NOT_FOUND',404);}),
 http.patch(`${root}/:c`,async({params,request})=>{const c=find(params.w,params.c);if(!c)return fail('RESOURCE_NOT_FOUND',404);const b=await request.json() as {title:string};if(!b.title?.trim())return fail('VALIDATION_ERROR',422);c.title=b.title;c.updatedAt=new Date().toISOString();return apiResponse(summary(c));}),
 http.delete(`${root}/:c`,({params})=>{const c=find(params.w,params.c);if(!c)return fail('RESOURCE_NOT_FOUND',404);if(active.has(c.chatId))return fail('CHAT_RUN_ALREADY_ACTIVE',409);chats.delete(c.chatId);return new HttpResponse(null,{status:204});}),
 http.post(`${root}/:c/messages`,({params,request})=>execute(params.w,params.c,request)),
 http.post(`${root}/:c/messages/:m/retry`,({params,request})=>execute(params.w,params.c,request,Number(params.m))),
 http.post(`${root}/:c/runs/:r/cancel`,({params})=>{const c=find(params.w,params.c),run=c&&active.get(c.chatId);if(!run||run.runId!==params.r)return fail('RESOURCE_NOT_FOUND',404);run.cancelled=true;run.message.status='CANCELLED';return apiResponse({runId:run.runId},202);}),
 ]};
}
