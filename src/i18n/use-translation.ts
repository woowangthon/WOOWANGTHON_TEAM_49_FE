"use client";
import { createContext, useContext, useMemo } from 'react';
import { createTranslation, type Translation } from './translate';
import { defaultLocale, type Locale } from './config';
export const TranslationLocaleContext = createContext<Locale>(defaultLocale);
export function useTranslation() {
  const locale = useContext(TranslationLocaleContext);
  return useMemo(() => createTranslation(locale), [locale]);
}
export function useLocalized<T>(factory: (translation: Translation) => T): T {
  const translation = useTranslation();
  return useMemo(() => factory(translation), [factory, translation]);
}
