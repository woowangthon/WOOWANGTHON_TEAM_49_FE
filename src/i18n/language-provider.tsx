"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import {message, translateMessage} from './message';
import {createTranslation} from './translate';
import { TranslationLocaleContext } from './use-translation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAppServices, useSessionGeneration } from '@/hooks/use-app-services';
import { authKeys } from '@/features/auth/query-keys';
import type { CurrentUser } from '@/features/auth/types';
import { catalogs } from './catalog.generated';
import { defaultLocale, resolveLocale, syncLocaleCookie, timeZone, type Locale } from './config';

const LanguageContext = createContext<{locale: Locale; pending: boolean; error: string | null; select: (locale: Locale) => Promise<void>} | null>(null);
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required');
  return value;
}
export function LanguageProvider({children, initialLocale = defaultLocale}: {children: ReactNode; initialLocale?: Locale}) {
  const {status} = useAuth();
  const generation = useSessionGeneration();
  const {authApi, queryClient, session} = useAppServices();
  const user = useSyncExternalStore(
    listener => queryClient.getQueryCache().subscribe(event => {
      if (JSON.stringify(event.query.queryKey) === JSON.stringify(authKeys.me(generation))) queueMicrotask(listener);
    }),
    () => queryClient.getQueryState<CurrentUser>(authKeys.me(generation)),
    () => undefined,
  );
  const router = useRouter();
  const [guest, setGuest] = useState<{generation: number; locale: Locale} | null>(null);
  const [pending, setPending] = useState(false);
  const [operationGeneration, setOperationGeneration] = useState(generation);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef<number | null>(null);
  // Restoring uses the exact server hint, then DB wins. Guest choices are memory only.
  const locale = status === 'restoring' ? initialLocale : status === 'authenticated'
    ? resolveLocale(user?.status === 'error' ? null : user?.data?.language)
    : status === 'anonymous' && guest?.generation === generation ? guest.locale : defaultLocale;
  useEffect(() => {
    syncLocaleCookie(locale);
    document.documentElement.lang = locale;
    if (locale !== initialLocale) router.refresh?.();
  }, [locale, initialLocale, router]);

  const {translate} = createTranslation(locale);
  async function select(next: Locale) {
    if (resolveLocale(next) !== next || lock.current === generation || next === locale || status === 'restoring' || status === 'signing-out') return;
    if (status !== 'authenticated') { setGuest({generation, locale: next}); return; }
    lock.current = generation; setOperationGeneration(generation); setPending(true); setError(null);
    const started = session.getSnapshot().generation;
    try {
      const saved = await authApi.changeLanguage(next);
      if (session.getSnapshot().generation !== started) return;
      queryClient.setQueryData<CurrentUser>(authKeys.me(started), previous => previous ? {...previous, language: saved.language} : previous);
    } catch {
      if (session.getSnapshot().generation === started) setError(message('common.languageError'));
    } finally {
      if (session.getSnapshot().generation === started) { lock.current = null; setPending(false); }
    }
  }
  return <LanguageContext value={{locale, pending: operationGeneration === generation && pending, error: operationGeneration === generation && error ? translateMessage(error, translate) : null, select}}><TranslationLocaleContext value={locale}>
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone={timeZone}>{children}</NextIntlClientProvider>
  </TranslationLocaleContext></LanguageContext>;
}
