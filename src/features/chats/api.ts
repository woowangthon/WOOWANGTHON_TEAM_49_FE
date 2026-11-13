
import {message as describeMessage} from '@/i18n/message';
import { z } from 'zod';
import { decodeWith, pageSchema } from '@/lib/api/schema';
import type { ApiClient } from '@/lib/api/client';
import {createTranslation, type Translation} from '@/i18n/translate';
import {defaultLocale} from '@/i18n/config';
export type ChatScope=z.infer<typeof scopeSchema>;
export type Message=z.infer<typeof messageSchema>;

export function createLocalizedFeaturesChatsApi(translation: Translation) {
  const {} = translation;
const scopeSchema=z.discriminatedUnion('scopeType',[z.object({scopeType:z.literal('CASE'),caseId:z.number().int().positive()}),z.object({scopeType:z.literal('WORKPLACE_ALL')})]);
const chatTitleSchema = z.string().min(1, describeMessage("chats.api_input")).max(200, describeMessage("chats.api_atMost_input"));
const chatCreateSchema = z.strictObject({ title: chatTitleSchema.optional(), defaultScope: scopeSchema });
const chatPatchSchema = z.strictObject({ title: chatTitleSchema });
const sourceSchema=z.object({documentId:z.number().int().positive().nullable(),caseId:z.number().int().positive(),page:z.number().int().positive().nullable(),fieldId:z.number().int().positive().nullable().optional(),text:z.string().optional()}).passthrough();
const refSchema=z.object({caseId:z.number().int().positive().optional(),type:z.string(),snapshotId:z.number().int().positive(),version:z.number().int().positive()});
const messageSchema=z.object({messageId:z.number().int().positive(),role:z.enum(['USER','ASSISTANT']),content:z.string(),status:z.enum(['PENDING','STREAMING','COMPLETED','FAILED','CANCELLED']),scope:scopeSchema,sources:z.array(sourceSchema).optional(),resultRefs:z.array(refSchema).optional(),sourceMayBeOutdated:z.boolean(),runId:z.string().nullable(),errorCode:z.string().nullable().optional()}).passthrough();
const sessionSchema=z.object({chatId:z.number().int().positive(),workplaceId:z.number().int().positive(),title:z.string(),defaultScope:scopeSchema,updatedAt:z.string(),lastMessagePreview:z.string().nullable().optional()}).passthrough();
const detailSchema=z.object({session:sessionSchema,messages:pageSchema(messageSchema)});
function chatApi(api:ApiClient,w:number){
 const root=`/workplaces/${w}/chats`;
 return {
 list:(page:number,signal?:AbortSignal)=>api.requestJson(`${root}?page=${page}&size=20`,decodeWith(pageSchema(sessionSchema)),{signal,expectedStatus:200}),
 detail:(id:number,page:number,signal?:AbortSignal)=>api.requestJson(`${root}/${id}?page=${page}&size=20`,decodeWith(detailSchema),{signal,expectedStatus:200}),
 create:(title:string,caseId:number)=>api.requestJson(root,decodeWith(z.object({chatId:z.number().int().positive()})),{method:'POST',body:chatCreateSchema.parse({title,defaultScope:{scopeType:'CASE',caseId}}),expectedStatus:201}),
 rename:(id:number,title:string)=>api.requestJson(`${root}/${id}`,decodeWith(z.unknown()),{method:'PATCH',body:chatPatchSchema.parse({title}),expectedStatus:200}),
 remove:(id:number)=>api.requestNoContent(`${root}/${id}`,{method:'DELETE'}),
 stream:(id:number,signal:AbortSignal,content:string,scope?:ChatScope,retry?:number,clientMessageId?:string)=>api.requestSse(`${root}/${id}/messages${retry?`/${retry}/retry`:''}`,{method:'POST',signal,refresh:false,...(!retry?{body:{content,...(clientMessageId?{clientMessageId}:{}),...(scope?{scope}: {})}}:{})}),
 cancel:(id:number,run:string)=>api.requestAccepted(`${root}/${id}/runs/${encodeURIComponent(run)}/cancel`,{method:'POST',expectedStatus:202,refresh:false}),
 };
}
return {scopeSchema, chatTitleSchema, chatCreateSchema, chatPatchSchema, sourceSchema, refSchema, messageSchema, sessionSchema, detailSchema, chatApi};
}

export const {scopeSchema, chatTitleSchema, chatCreateSchema, chatPatchSchema, sourceSchema, refSchema, messageSchema, sessionSchema, detailSchema, chatApi} = createLocalizedFeaturesChatsApi(createTranslation(defaultLocale));
