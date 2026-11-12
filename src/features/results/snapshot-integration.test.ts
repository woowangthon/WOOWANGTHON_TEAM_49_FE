import { it,expect } from 'vitest';
import { server,testApiUrl } from '@/test/server';
import { managementMocks } from '@/mocks/shared/management-handlers';
import { inputMocks } from '@/mocks/shared/input-handlers';
import { chatMocks } from '@/mocks/shared/chat-handlers';
import { createAppServices } from '@/lib/app-services';
import { chatApi } from '@/features/chats/api';
import { consumeChat } from '@/features/chats/stream';
import { loadSnapshot } from './selected-snapshot';
import { snapshotKind } from './snapshot-link';
it('resolves all real mock references, preserves past refs after input change and rejects missing snapshots',async()=>{
 const m=managementMocks(),inputs=inputMocks(m.getCases,testApiUrl);
 inputs.getResult(15);inputs.notifyInputChange(15);inputs.setJobStatus(15,"PARTIAL");
 const chats=chatMocks(testApiUrl,m.getCases,c=>{const r=inputs.getResult(c)!;return {inputVersion:r.currentInputVersion,sources:[],resultRefs:Object.entries(r.versions).flatMap(([type,v])=>v?.snapshotId&&v.version?[{caseId:c,type,snapshotId:v.snapshotId,version:v.version}]:[])};});
 server.use(...chats.handlers,...inputs.handlers,...m.handlers);
 const app=createAppServices(testApiUrl);const api=chatApi(app.api,3);const c=await api.create('질문',15);
 await consumeChat(await api.stream(c.chatId,new AbortController().signal,'설명'),()=>{});
 const original=(await api.detail(c.chatId,1)).messages.items[1];expect(original.resultRefs).toHaveLength(4);
 for(const ref of original.resultRefs ?? []){const value=await loadSnapshot(app.api,15,snapshotKind(ref.type)!,ref.snapshotId,ref.version);expect(value.version).toBe(ref.version);}
 inputs.notifyInputChange(15);inputs.setJobStatus(15,'PARTIAL');const after=(await api.detail(c.chatId,1)).messages.items[1];expect(after.resultRefs).toEqual(original.resultRefs);expect(after.sourceMayBeOutdated).toBe(true);
 for(let i=0;i<21;i++){inputs.notifyInputChange(15);inputs.setJobStatus(15,'PARTIAL');}
 const oldest=(original.resultRefs ?? []).find(r=>r.type==='comparison')!;expect((await loadSnapshot(app.api,15,'comparison',oldest.snapshotId,oldest.version)).version).toBe(oldest.version);
 await expect(loadSnapshot(app.api,15,'comparison',99999,1)).rejects.toThrow('찾을 수');await expect(loadSnapshot(app.api,15,'calculation',99999,1)).rejects.toThrow();
},15000);
