// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {afterEach, expect, it, vi} from 'vitest';
import {act, cleanup, render, screen} from '@testing-library/react';
import {QueryClientProvider} from '@tanstack/react-query';
import {http} from 'msw';
import {AppServicesContext} from '@/hooks/use-app-services';
import {createAppServices} from '@/lib/app-services';
import {server, apiResponse, testApiUrl, testUser} from '@/test/server';
import {authKeys} from '@/features/auth/query-keys';
import {LanguageProvider, useLanguage} from './language-provider';
import type {Locale} from './config';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
afterEach(cleanup);
async function setup() {
 const app=createAppServices(testApiUrl);await app.auth.login({email:testUser.email,password:'password1234'});
 let value:ReturnType<typeof useLanguage>;
 function Probe(){value=useLanguage();return <output>{value.locale}</output>;}
 render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><LanguageProvider><Probe/></LanguageProvider></QueryClientProvider></AppServicesContext>);
 return {app,current:()=>value!};
}
it.each(['en','zh','vi','km'] as const)('saves %s once, synchronizes cache and resets on logout',async language=>{
 let calls=0;server.use(http.patch(`${testApiUrl}/users/me/language`,async({request})=>{calls++;expect(await request.json()).toEqual({language});return apiResponse({language});}));
 const {app,current}=await setup();await act(async()=>{await Promise.all([current().select(language),current().select(language)]);});
 expect(calls).toBe(1);expect(current().locale).toBe(language);expect(document.documentElement.lang).toBe(language);
 expect(app.queryClient.getQueryData(authKeys.me(app.session.getSnapshot().generation))).toMatchObject({language});
 await act(()=>app.auth.logout());expect(current().locale).toBe('ko');
 await act(()=>app.auth.login({email:testUser.email,password:'password1234'}));expect(current().locale).toBe('ko');
});
it('preserves applied locale and DB cache on failure',async()=>{
 server.use(http.patch(`${testApiUrl}/users/me/language`,()=>apiResponse({errorCode:'VALIDATION_ERROR'},422)));
 const {app,current}=await setup();await act(()=>current().select('en' as Locale));
 expect(current().locale).toBe('ko');expect(current().error).toBeTruthy();expect(screen.getByRole('status').textContent).toBe('ko');
 expect(app.queryClient.getQueryData(authKeys.me(app.session.getSnapshot().generation))).not.toMatchObject({language:'en'});
});
it('changes guest language in memory without PATCH',async()=>{
 const {app,current}=await setup();await act(()=>app.auth.logout());const patch=vi.spyOn(app.authApi,'changeLanguage');
 await act(()=>current().select('en' as Locale));expect(current().locale).toBe('en');expect(patch).not.toHaveBeenCalled();
 await act(()=>app.auth.login({email:testUser.email,password:'password1234'}));expect(current().locale).toBe('ko');
});
