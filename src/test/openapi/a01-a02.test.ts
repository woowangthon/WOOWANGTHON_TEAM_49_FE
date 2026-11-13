// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createOpenApiContract } from './contract';
import { server, testApiUrl } from '@/test/server';
import { createDevelopmentScenario, clearMockSession, demoAccount } from '@/mocks/development';
import { signupRequestSchema, forgotPasswordRequestSchema, resetPasswordRequestSchema } from '@/features/auth/schemas';
import { workplaceCreateSchema, workplacePatchSchema } from '@/features/workplaces/schemas';
import { linkCreateSchema, linkPatchSchema } from '@/features/documents/schemas';
import { chatCreateSchema, chatPatchSchema } from '@/features/chats/api';
import { workplaceApi } from '@/features/workplaces/api';
import { documentApi } from '@/features/documents/api';
import { chatApi } from '@/features/chats/api';
import { readDevelopmentResetToken } from '@/mocks/development';
import { createAppServices } from '@/lib/app-services';
const contract=createOpenApiContract();
const schemas={Signup:signupRequestSchema,ForgotPassword:forgotPasswordRequestSchema,ResetPassword:resetPasswordRequestSchema,WorkplaceCreate:workplaceCreateSchema,WorkplacePatch:workplacePatchSchema,LinkCreate:linkCreateSchema,LinkPatch:linkPatchSchema,ChatCreate:chatCreateSchema,ChatPatch:chatPatchSchema};
const base:Record<keyof typeof schemas,Record<string,unknown>>={
 Signup:{email:'a@b.c',password:'12345678',name:'a'},ForgotPassword:{email:'a@b.c'},ResetPassword:{token:'t'.repeat(20),newPassword:'12345678'},
 WorkplaceCreate:{name:'a'},WorkplacePatch:{name:'a'},LinkCreate:{documentId:102},LinkPatch:{},
 ChatCreate:{defaultScope:{scopeType:'CASE',caseId:15}},ChatPatch:{title:'a'}
};
const paths:Record<keyof typeof schemas,[string,string]>={Signup:['POST','/auth/signup'],ForgotPassword:['POST','/auth/forgot-password'],ResetPassword:['POST','/auth/reset-password'],WorkplaceCreate:['POST','/workplaces'],WorkplacePatch:['PATCH','/workplaces/3'],LinkCreate:['POST','/cases/15/document-links'],LinkPatch:['PATCH','/cases/15/document-links/777'],ChatCreate:['POST','/workplaces/3/chats'],ChatPatch:['PATCH','/workplaces/3/chats/101']};
const doc=JSON.parse(readFileSync('contracts/openapi.json','utf8'));
beforeEach(()=>{clearMockSession();server.use(...createDevelopmentScenario(testApiUrl).handlers);});
for(const name of Object.keys(schemas) as (keyof typeof schemas)[]){
 const properties=doc.components.schemas[name].properties;
 for(const [field,raw] of Object.entries(properties) as [string,{type?:string;anyOf?:{type:string;minLength?:number;maxLength?:number}[];minLength?:number;maxLength?:number}][]){
  const rule=raw.anyOf?.find(v=>v.type==='string')??raw;if(rule.type!=='string')continue;
  const values:unknown[]=[undefined,null,'', 'x'.repeat(rule.minLength??0),'x'.repeat(rule.maxLength??20),'x'.repeat((rule.maxLength??20)+1)];
  if(field==='email')values.push('a@b.c',' a@b.c','a@@b.c','a@b','x'.repeat(250)+'@b.c','x'.repeat(251)+'@b.c');
  for(const [i,value] of values.entries())it(name+'.'+field+' boundary '+i,async()=>{
   const body={...base[name], [field]:value};if(value===undefined)delete body[field];
   const expected=contract.component(name,body).valid;
   expect(schemas[name].safeParse(body).success).toBe(expected);
   const app=createAppServices(testApiUrl);await app.auth.login({email:demoAccount.email,password:demoAccount.password});
   // Existing target is required to distinguish contract rejection from a missing chat.
   if(name==='ChatPatch')await fetch(testApiUrl+'/workplaces/3/chats',{method:'POST',headers:{Authorization:'Bearer '+app.session.getSnapshot().accessToken},body:JSON.stringify(base.ChatCreate)});
   const [method,path]=paths[name];
   const response=await fetch(testApiUrl+path,{method,headers:{Authorization:'Bearer '+app.session.getSnapshot().accessToken},body:JSON.stringify(body)});
   if(!expected)expect(response.status).toBe(422);
   else if(name !== "ResetPassword") expect(response.status).not.toBe(422);
  });
 }
}
it('captures real FE requests and checks P0 independently',async()=>{
 const app=createAppServices(testApiUrl);
 const seen:unknown[]=[];
 const listener=async({request}:{request:Request})=>{
  if(!['POST','PATCH'].includes(request.method))return;
  const input={method:request.method,url:request.url,headers:Object.fromEntries(request.headers),body:await request.clone().json()};
  seen.push(input);
 };
 server.events.on('request:start',listener);
 try{await app.authApi.signup({email:'capture@example.com',password:'12345678',name:'Captured'});await app.authApi.forgotPassword('capture@example.com');
 await app.authApi.resetPassword(readDevelopmentResetToken(),'replacement-password');
 await app.auth.login({email:demoAccount.email,password:demoAccount.password});
 const workplaces=workplaceApi(app.api);const w=await workplaces.create({name:'wire',industry:null,region:''});await workplaces.update(w.workplaceId,{name:'updated'});
 const docs=documentApi(app.api);await docs.updateLink(15,777,{purpose:null,expectedInputVersion:7});
 const chats=chatApi(app.api,3);const c=await chats.create('wire',15);await chats.rename(c.chatId,'updated');
 expect(seen.length).toBeGreaterThanOrEqual(9);
 for(const input of seen) expect(contract.request(input as Parameters<typeof contract.request>[0]),JSON.stringify(input)).toMatchObject({valid:true});}
 finally{server.events.removeListener('request:start',listener);}
});
