import { it,expect } from 'vitest';
import { consumeChat,type ChatEvent } from './stream';
const start={runId:'r',messageId:1,role:'ASSISTANT',scope:{scopeType:'CASE',caseId:15}};
const stream=(frames:Array<[string,unknown]>)=>new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode(frames.map(([e,d])=>`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('')));c.close();}});
it('preserves source and snapshot metadata',async()=>{const received:ChatEvent[]=[];const refs={sources:[{documentId:101,page:1,fieldId:501}],resultRefs:[{caseId:15,type:'payslipValidation',snapshotId:3,version:1}]};await consumeChat(stream([['message_start',start],['sources',refs],['message_done',{runId:'r',messageId:1,status:'COMPLETED'}]]),e=>received.push(e));expect(received[1]).toEqual({event:'sources',data:refs});});
it('rejects mismatched run identity',async()=>{await expect(consumeChat(stream([['message_start',start],['message_done',{runId:'other',messageId:1,status:'COMPLETED'}]]),()=>{})).rejects.toThrow();});
it('does not accept deltas before message_start',async()=>{await expect(consumeChat(stream([['content_delta',{delta:'text'}]]),()=>{})).rejects.toThrow();});
it('ignores undefined event names',async()=>{const received:ChatEvent[]=[];await consumeChat(stream([['toString',{}],['message_start',start],['message_done',{runId:'r',messageId:1,status:'CANCELLED'}]]),e=>received.push(e));expect(received).toHaveLength(2);});
