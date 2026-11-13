// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClientProvider} from '@tanstack/react-query';
import {http} from 'msw';
import {AppServicesContext} from '@/hooks/use-app-services';
import {createAppServices} from '@/lib/app-services';
import {server, apiResponse, testApiUrl, testUser, testLogin} from '@/test/server';
import {authKeys} from '@/features/auth/query-keys';
import {userSchema} from '@/features/auth/schemas';
import {LanguageProvider, useLanguage} from './language-provider';
import {LanguageSelector} from './language-selector';
import {defaultLocale, resolveLocale, locales, type Locale} from './config';
vi.mock('next/navigation', () => ({useRouter: () => ({refresh: vi.fn()})}));
afterEach(cleanup);
function mount(app = createAppServices(testApiUrl)) {
  let language: ReturnType<typeof useLanguage>;
  function Probe() {language = useLanguage(); return <output>{language.locale}</output>;}
  render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><LanguageProvider><LanguageSelector/><Probe/></LanguageProvider></QueryClientProvider></AppServicesContext>);
  return {app, current: () => language!};
}
describe('user locale and selector', () => {
  it('keeps backend codes separate from installed packs and missing fields', () => {
    expect(defaultLocale).toBe('ko'); expect(locales).toEqual(['ko']);
    for (const language of [undefined, null, 'en', 'vi', 'zh', 'km', 'invalid']) expect(resolveLocale(language)).toBe('ko');
    expect(userSchema.parse({...testUser, language:'en'}).language).toBe('en');
    expect(userSchema.parse(testUser).language).toBeUndefined();
  });
  it('shows only Korean, supports keyboard and makes no guest PATCH', async () => {
    const {app, current} = mount(); await act(() => app.auth.restore());
    const patch = vi.spyOn(app.authApi, 'changeLanguage');
    const user = userEvent.setup(); const button = screen.getByRole('button', {name:'표시 언어 선택'});
    button.focus(); await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole('menuitemradio', {name:'한국어'})).toHaveFocus());
    await user.keyboard('{Escape}'); expect(button).toHaveFocus();
    await act(() => current().select('ko')); expect(patch).not.toHaveBeenCalled();
  });
  it('uses login cache without another GET and does not overwrite unsupported saved language', async () => {
    server.use(http.post(`${testApiUrl}/auth/login`, () => apiResponse({...testLogin,user:{...testUser, language:'en'}})));
    const app=createAppServices(testApiUrl); await app.auth.login({email:testUser.email,password:'password1234'});
    const get=vi.spyOn(app.authApi,'getMe'); const patch=vi.spyOn(app.authApi,'changeLanguage');const {current}=mount(app);
    expect(current().locale).toBe('ko'); await act(()=>current().select('ko'));
    expect(get).not.toHaveBeenCalled();expect(patch).not.toHaveBeenCalled();
    expect(app.queryClient.getQueryData(authKeys.me(app.session.getSnapshot().generation))).toMatchObject({language:'en'});
    await act(()=>app.auth.logout());expect(current().locale).toBe('ko');
    expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
  it('falls back on cache error and rejects unavailable choices', async () => {
    const {app,current}=mount();await act(()=>app.auth.login({email:testUser.email,password:'password1234'}));
    const patch=vi.spyOn(app.authApi,'changeLanguage');await act(()=>current().select('en' as Locale));expect(patch).not.toHaveBeenCalled();
    await act(async()=>{app.queryClient.getQueryCache().find({queryKey:authKeys.me(app.session.getSnapshot().generation)})?.setState({status:'error'});});
    expect(current().locale).toBe('ko');await waitFor(()=>expect(document.documentElement.lang).toBe('ko'));
  });
  it('decodes PATCH success and errors through the existing authenticated API', async () => {
    const app=createAppServices(testApiUrl);await app.auth.login({email:testUser.email,password:'password1234'});
    server.use(http.patch(`${testApiUrl}/users/me/language`,async({request})=>{expect(request.headers.get('Authorization')).toContain('Bearer ');expect(await request.json()).toEqual({language:'ko'});return apiResponse({language:'ko'});}));
    await expect(app.authApi.changeLanguage('ko')).resolves.toEqual({language:'ko'});
    server.use(http.patch(`${testApiUrl}/users/me/language`,()=>apiResponse({errorCode:'VALIDATION_ERROR'},422)));
    await expect(app.authApi.changeLanguage('ko')).rejects.toMatchObject({status:422});
    server.use(http.patch(`${testApiUrl}/users/me/language`,()=>apiResponse({language:'unknown'})));
    await expect(app.authApi.changeLanguage('ko')).rejects.toBeDefined();
  });
});
