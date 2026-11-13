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
import {defaultLocale, resolveLocale, locales, languageCatalog, type Locale} from './config';
vi.mock('next/navigation', () => ({useRouter: () => ({refresh: vi.fn()})}));
afterEach(cleanup);
function mount(app = createAppServices(testApiUrl), initialLocale: Locale = defaultLocale) {
  let language: ReturnType<typeof useLanguage>;
  function Probe() {language = useLanguage(); return <output>{language.locale}</output>;}
  render(<AppServicesContext value={app}><QueryClientProvider client={app.queryClient}><LanguageProvider initialLocale={initialLocale}><LanguageSelector/><Probe/></LanguageProvider></QueryClientProvider></AppServicesContext>);
  return {app, current: () => language!};
}
describe('user locale and selector', () => {
  it.each([
    ['ko', '\uC5B8\uC5B4'], ['en', 'Language'], ['zh', '\u8BED\u8A00'], ['vi', 'Ng\u00F4n ng\u1EEF'], ['km', '\u1797\u17B6\u179F\u17B6'],
  ] as const)('shows only the localized label for %s and decorative SVG flags', async (locale, label) => {
    mount(undefined, locale);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent(label);
    expect(button.textContent).toBe(label);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const user = userEvent.setup();
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    for (const code of locales) {
      const option = screen.getByRole('menuitemradio', {name: languageCatalog[code].name});
      expect(option).toHaveAttribute('aria-checked', String(code === locale));
      const flag = option.querySelector('img');
      expect(flag).toHaveAttribute('src', languageCatalog[code].flagSrc);
      expect(flag).toHaveAttribute('alt', '');
      expect(option.textContent).toBe(languageCatalog[code].name);
    }
    await user.keyboard('{End}');
    await waitFor(() => expect(screen.getAllByRole('menuitemradio').at(-1)).toHaveFocus());
    await user.keyboard('{Home}');
    await waitFor(() => expect(screen.getAllByRole('menuitemradio')[0]).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(button).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(button);
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('disables the trigger while saving and shows failure without changing the applied label', async () => {
    const {app} = mount();
    await act(() => app.auth.login({email:testUser.email, password:'password1234'}));
    let reject!: (error: Error) => void;
    vi.spyOn(app.authApi, 'changeLanguage').mockImplementation(() => new Promise((_, fail) => {reject = fail;}));
    const user = userEvent.setup();
    const button = screen.getByRole('button');
    await user.click(button);
    await user.click(screen.getByRole('menuitemradio', {name:'English'}));
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await act(async () => reject(new Error('save failed')));
    expect(button).toBeEnabled();
    expect(button.textContent).toBe('\uC5B8\uC5B4');
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('keeps backend codes separate from installed packs and missing fields', () => {
    expect(defaultLocale).toBe('ko'); expect([...locales].sort()).toEqual(['en','km','ko','vi','zh']);
    for (const language of [undefined, null, 'zh-CN', 'invalid']) expect(resolveLocale(language)).toBe('ko');
    for (const language of locales) expect(resolveLocale(language)).toBe(language);
    expect(userSchema.parse({...testUser, language:'en'}).language).toBe('en');
    expect(userSchema.parse(testUser).language).toBeUndefined();
  });
  it('shows installed packs, supports keyboard and makes no redundant PATCH', async () => {
    const {app, current} = mount(); await act(() => app.auth.restore());
    const patch = vi.spyOn(app.authApi, 'changeLanguage');
    const user = userEvent.setup(); const button = screen.getByRole('button', {name:'표시 언어 선택'});
    button.focus(); await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(5);
    await waitFor(() => expect(screen.getAllByRole('menuitemradio')[0]).toHaveFocus());
    await user.keyboard('{Escape}'); expect(button).toHaveFocus();
    await act(() => current().select('ko')); expect(patch).not.toHaveBeenCalled();
  });
  it('uses login cache without another GET and does not overwrite unsupported saved language', async () => {
    server.use(http.post(`${testApiUrl}/auth/login`, () => apiResponse({...testLogin,user:{...testUser, language:'en'}})));
    const app=createAppServices(testApiUrl); await app.auth.login({email:testUser.email,password:'password1234'});
    const get=vi.spyOn(app.authApi,'getMe'); const patch=vi.spyOn(app.authApi,'changeLanguage');const {current}=mount(app);
    expect(current().locale).toBe('en'); await act(()=>current().select('en'));
    expect(get).not.toHaveBeenCalled();expect(patch).not.toHaveBeenCalled();
    expect(app.queryClient.getQueryData(authKeys.me(app.session.getSnapshot().generation))).toMatchObject({language:'en'});
    await act(()=>app.auth.logout());expect(current().locale).toBe('ko');
    expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
  it('falls back on cache error and rejects unavailable choices', async () => {
    const {app,current}=mount();await act(()=>app.auth.login({email:testUser.email,password:'password1234'}));
    const patch=vi.spyOn(app.authApi,'changeLanguage');await act(()=>current().select('invalid' as Locale));expect(patch).not.toHaveBeenCalled();
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
