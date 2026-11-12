
import { translate } from "@/i18n/translate";
﻿import { z } from 'zod';
import { ApiError } from '@/lib/api/error';
import { decodeWith } from '@/lib/api/schema';
import { readSseFrames } from '@/lib/api/sse';
import { protocolError } from '@/lib/api/response';
import { scopeSchema,sourceSchema,refSchema } from './api';
const identity={runId:z.string().min(1),messageId:z.number().int().positive()};
export const events={
 message_start:z.object({...identity,role:z.literal('ASSISTANT'),scope:scopeSchema,aiMode:z.string().optional()}),
 content_delta:z.object({delta:z.string()}),
 sources:z.object({sources:z.array(sourceSchema),resultRefs:z.array(refSchema)}),
 message_done:z.object({...identity,status:z.enum(['COMPLETED','CANCELLED','FAILED'])}),
 error:z.object({...identity,errorCode:z.string(),retryable:z.boolean()}),
};
export type ChatEvent={ [K in keyof typeof events]:{event:K;data:z.infer<(typeof events)[K]>} }[keyof typeof events];
export async function consumeChat(stream:ReadableStream<Uint8Array>,onEvent:(event:ChatEvent)=>void){
 let start:z.infer<typeof events.message_start>|undefined;
 try { for await(const frame of readSseFrames(stream)){
  if(!Object.hasOwn(events,frame.event))continue;
  const event=frame.event as keyof typeof events;
  const parsed=events[event].safeParse(JSON.parse(frame.data));
  if(!parsed.success){decodeWith<unknown>(events[event])(JSON.parse(frame.data));throw protocolError(200,"sse");}
  const value=parsed.data;
  if(event==='message_start'){if(start)throw protocolError();start=events.message_start.parse(value);}
  else if(!start)throw protocolError();
  if('runId' in value && start && (value.runId!==start.runId || value.messageId!==start.messageId))throw protocolError();
  onEvent({event,data:value} as ChatEvent);
  if(event==='message_done'||event==='error')return;
 }
 throw new Error(translate("chats.stream_link_answer_complete_confirm_save_status_retry"));
 } catch (error) {
  if(error instanceof Error && error.name==="AbortError") throw error;
  const failure = protocolError(200,"sse");
  if(error instanceof ApiError) failure.diagnostic = {...error.diagnostic,phase:"sse",httpStatus:200};
  throw failure;
 }
}
