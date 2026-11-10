import { describe,it,expect,beforeEach,vi } from 'vitest';
import { server,testApiUrl } from '@/test/server';
import { chatMocks } from '@/mocks/shared/chat-handlers';
import { createApiClient } from '@/lib/api/client';
import { createMemorySession } from '@/features/auth/session';
import { chatApi } from './api';
import { consumeChat,type ChatEvent } from './stream';
vi.setConfig({testTimeout:15000});
let api:ReturnType<typeof chatApi>;
const makeApi=()=>chatApi(createApiClient({baseUrl:testApiUrl,session:createMemorySession()}),3);
beforeEach(()=>{api=makeApi();server.use(...chatMocks(testApiUrl,()=>[{caseId:15,workplaceId:3},{caseId:16,workplaceId:4}]).handlers);});
const create=()=>api.create('자료 질문',15);
async function send(id:number,content='설명',retry?:number){const events:ChatEvent[]=[];await consumeChat(await api.stream(id,new AbortController().signal,content,undefined,retry),e=>events.push(e));return events;}
describe('chat mock contracts (conditional history DTO)',()=>{
 it('creates lists renames deletes and isolates workplace',async()=>{const c=await create();expect((await api.list(1)).total).toBe(1);await api.rename(c.chatId,'수정');expect((await api.detail(c.chatId,1)).session.title).toBe('수정');const other=chatApi(createApiClient({baseUrl:testApiUrl,session:createMemorySession()}),4);await expect(other.detail(c.chatId,1)).rejects.toMatchObject({status:404});await api.remove(c.chatId);await expect(api.detail(c.chatId,1)).rejects.toMatchObject({status:404});});
 it('rejects foreign Case',async()=>{await expect(api.create('제목',16)).rejects.toMatchObject({status:404});});
 it('streams fragmented UTF8 and restores saved messages',async()=>{const c=await create(),events=await send(c.chatId);expect(events[0].event).toBe('message_start');expect(events.at(-1)?.event).toBe('message_done');const d=await api.detail(c.chatId,1);expect(d.messages.total).toBe(2);expect(d.messages.items[1].content).toContain('개발용');expect(d.messages.items[1].scope).toEqual({scopeType:'CASE',caseId:15});expect(d.messages.items[1].sources[0].documentId).toBe(101);await expect(send(c.chatId,'',d.messages.items[1].messageId)).rejects.toMatchObject({status:409});});
 it('keeps failed assistant and does not duplicate user on retry',async()=>{const c=await create();const e=await send(c.chatId,'생성 실패');expect(e.at(-1)?.event).toBe('error');let d=await api.detail(c.chatId,1);await send(c.chatId,'',d.messages.items[1].messageId);d=await api.detail(c.chatId,1);expect(d.messages.items.filter(m=>m.role==='USER')).toHaveLength(1);expect(d.messages.items.filter(m=>m.role==='ASSISTANT')).toHaveLength(2);});
 it('distinguishes pre-stream JSON errors',async()=>{const c=await create();await expect(send(c.chatId,'JSON 오류')).rejects.toMatchObject({status:409});expect((await api.detail(c.chatId,1)).messages.total).toBe(0);});
 it('does not complete on unexpected EOF',async()=>{const c=await create();await expect(send(c.chatId,'연결 중단')).rejects.toThrow('완료');expect((await api.detail(c.chatId,1)).messages.items[1].status).toBe('FAILED');});
 it('cancels active run, blocks concurrent runs, permits retry',async()=>{const c=await create();const stream=await api.stream(c.chatId,new AbortController().signal,'설명');const done=consumeChat(stream,()=>{});const d=await api.detail(c.chatId,1);await expect(send(c.chatId)).rejects.toMatchObject({status:409});await api.cancel(c.chatId,d.messages.items[1].runId!);await done;expect((await api.detail(c.chatId,1)).messages.items[1].status).toBe('CANCELLED');await send(c.chatId,'',d.messages.items[1].messageId);expect((await api.detail(c.chatId,1)).messages.total).toBe(3);});
 it('requires explicit all scope',async()=>{const c=await create();await consumeChat(await api.stream(c.chatId,new AbortController().signal,'설명',{scopeType:'WORKPLACE_ALL'}),()=>{});expect((await api.detail(c.chatId,1)).messages.items[0].scope).toEqual({scopeType:'WORKPLACE_ALL'});});
});
it('parses multiline CRLF payload and ignores heartbeat',async()=>{const bytes=new TextEncoder().encode(': waiting\r\nevent: message_start\r\ndata: {"runId":"r","messageId":1,\r\ndata: "role":"ASSISTANT","scope":{"scopeType":"CASE","caseId":15}}\r\n\r\nevent: message_done\ndata: {"runId":"r","messageId":1,"status":"COMPLETED"}\n\n');const events:ChatEvent[]=[];await consumeChat(new ReadableStream({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close();}}),e=>events.push(e));expect(events.map(e=>e.event)).toEqual(['message_start','message_done']);});
