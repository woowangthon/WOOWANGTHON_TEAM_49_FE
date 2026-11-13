import {AsyncLocalStorage} from 'node:async_hooks';
import {execFileSync} from 'node:child_process';
import {beforeAll, expect, it, vi} from 'vitest';
import type {Locale} from './config';
const request = vi.hoisted(()=>({scope:undefined as AsyncLocalStorage<string>|undefined}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:request.scope?.getStore()})})}));
vi.mock('next-intl/server',()=>({
 getRequestConfig:(callback:unknown)=>callback,
 getTranslations:async(namespace?:string)=>{
  const {createTranslation}=await import('./translate');
  const {resolveLocale}=await import('./config');
  const {translate}=createTranslation(resolveLocale(request.scope?.getStore()));
  return (key:string)=>translate((namespace?namespace+'.'+key:key) as Parameters<typeof translate>[0]);
 },
}));
import config from './request';
import {generateMetadata as loginMetadata} from '@/app/(auth)/login/page';
import {generateMetadata as accountMetadata} from '@/app/forgot-password/page';
import {createTranslation} from './translate';
import {locales} from './config';
beforeAll(()=>{request.scope=new AsyncLocalStorage<string>();});
it('keeps concurrent server request locale, messages and metadata isolated',async()=>{
 async function render(locale:string){return request.scope!.run(locale,async()=>{
  const options=await config({requestLocale:Promise.resolve(undefined)});
  const metadata=await loginMetadata();const account=await accountMetadata();
  return {locale:options.locale,messages:options.messages,metadata,account};
 });}
 const [ko,en,fallback,...others]=await Promise.all([render('ko'),render('en'),render('invalid'),...locales.map(render)]);
 expect(ko.locale).toBe('ko');expect(en.locale).toBe('en' as Locale);expect(fallback.locale).toBe('ko');
 expect(en.metadata.title).not.toBe(ko.metadata.title);expect(en.account.title).not.toBe(ko.account.title);
 for(const result of others){const t=createTranslation(result.locale as Locale);expect(result.metadata.title).toBe(t.translate('common.page_login'));}
 expect(fallback.metadata.title).toBe(ko.metadata.title);
});
it('runs scope policy regression fixtures for module constants, metadata, state and formatters',()=>{
 expect(execFileSync(process.execPath,['scripts/i18n-policy.mjs','--self-test'],{encoding:'utf8'})).toContain('fixtures passed');
});
