// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen, fireEvent, waitFor} from '@testing-library/react';
import {TranslationLocaleContext, useLocalized} from './use-translation';
import {createTranslation} from './translate';
import {message, errorMessage, translateMessage} from './message';
import {useMessageState} from './use-message-state';
import {useForm} from './use-localized-form';
import {createLocalizedFeaturesCasesViewModels} from '@/features/cases/view-models';
import {createLocalizedFeaturesDocumentsViewModels} from '@/features/documents/view-models';
import {createLocalizedFeaturesDocumentsReviewViewModels} from '@/features/documents/review/view-models';
import {createLocalizedFeaturesResultsViewModels} from '@/features/results/view-models';
import {createLocalizedFeaturesAuthSchemas} from '@/features/auth/schemas';
import {createLocalizedFeaturesCaseInputsManualFields} from '@/features/case-inputs/manual-fields';
import {createLocalizedLibApiFormErrors} from '@/lib/api/form-errors';
import type {Locale} from './config';
vi.mock('./catalog.generated',async()=>{
 const {default:ko}=await import('@/messages/ko');
 const en=Object.fromEntries(Object.entries(ko).map(([ns,values])=>[ns,Object.fromEntries(Object.entries(values).map(([k,v])=>[k,'EN '+v]))]));
 return {locales:['ko','en'],catalogs:{ko,en},messageLoaders:{ko:async()=>ko,en:async()=>en}};
});
afterEach(cleanup);
const en='en' as Locale;
it('renders deferred Zod and nested stream messages with the display locale while preserving external text',()=>{
 const english=createTranslation(en);
 const result=createLocalizedFeaturesAuthSchemas(english).loginRequestSchema.safeParse({email:'bad',password:''});
 if(result.success) throw new Error('Expected invalid input');
 expect(translateMessage(errorMessage(result.error),english.translate)).toMatch(/^EN /);
 const stream=message('chats.streamFailure',{code:'ERR',retry:message('chats.chatScreen_retry')});
 expect(translateMessage(stream,english.translate)).not.toContain('__wageitda_message__');
 expect(translateMessage(stream,english.translate)).toContain('ERR');
 expect(errorMessage(new Error('external original'))).toBe('external original');
});
it('isolates all label factories and ordinary formatters by caller locale',()=>{
 const ko=createTranslation('ko'),english=createTranslation(en);
 for(const factory of [createLocalizedFeaturesCasesViewModels,createLocalizedFeaturesDocumentsViewModels,createLocalizedFeaturesDocumentsReviewViewModels,createLocalizedFeaturesResultsViewModels,createLocalizedFeaturesCaseInputsManualFields]){
  const korean=factory(ko),other=factory(english);
  function compare(a:unknown,b:unknown){if(typeof a==='string'&&/[가-힣]/.test(a)){expect(b).toBe('EN '+a);return;}if(a&&b&&typeof a==='object'&&typeof b==='object')for(const key of Object.keys(a))compare((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]);}
  compare(korean,other);
 }
 expect(createLocalizedFeaturesResultsViewModels(english).displayScalar(null)).toMatch(/^EN /);
 expect(createLocalizedLibApiFormErrors(english).businessErrorMessage(new Error('external'))).toMatch(/^EN /);
 expect(createLocalizedFeaturesResultsViewModels(ko).displayScalar(null)).not.toMatch(/^EN /);
});
it('refreshes displayed labels and pending messages without losing local draft state',()=>{
 function Probe(){const {caseStatusLabels}=useLocalized(createLocalizedFeaturesCasesViewModels);const [status,setStatus]=useMessageState('');return <><label>draft<input defaultValue="keep"/></label><p>{caseStatusLabels.CREATED}</p><button onClick={()=>setStatus(message('common.loading_load'))}>pending</button><output>{status}</output></>;}
 const tree=(locale:Locale)=><TranslationLocaleContext value={locale}><Probe/></TranslationLocaleContext>;
 const {rerender}=render(tree('ko'));fireEvent.click(screen.getByText('pending'));expect(screen.getByRole('status').textContent).not.toMatch(/^EN /);
 rerender(tree(en));expect(screen.getByRole('status').textContent).toMatch(/^EN /);expect(screen.getByLabelText('draft')).toHaveValue('keep');
});
it('updates an existing validation error on locale switch without clearing form values',async()=>{
 function Form(){const {register,handleSubmit,formState:{errors}}=useForm<{email:string}>();return <form onSubmit={handleSubmit(()=>{})}><label>email<input {...register('email',{required:message('auth.schemas_valid_email_address_input')})}/></label><button>submit</button>{errors.email&&<p role="alert">{errors.email.message}</p>}</form>;}
 const tree=(locale:Locale)=><TranslationLocaleContext value={locale}><Form/></TranslationLocaleContext>;
 const {rerender}=render(tree('ko'));fireEvent.click(screen.getByText('submit'));await screen.findByRole('alert');rerender(tree(en));await waitFor(()=>expect(screen.getByRole('alert').textContent).toMatch(/^EN /));
 expect(screen.getByLabelText('email')).toHaveValue('');
 const schemas=createLocalizedFeaturesAuthSchemas(createTranslation(en));expect(schemas.loginRequestSchema.safeParse({email:'bad',password:''}).success).toBe(false);
});
