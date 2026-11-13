import { createTranslator, createFormatter } from 'next-intl';
import { catalogs } from './catalog.generated';
import { timeZone, type Locale } from './config';
import type {} from './types';
import type { ReactNode } from 'react';

// Explicit scope for non-React consumers; no mutable current-language singleton.
export function createTranslation(locale: Locale) {
  const translator = createTranslator({locale, messages: catalogs[locale], timeZone});
  type MessageKey = Parameters<typeof translator>[0];
  function translate(key: MessageKey, values?: Record<string, string | number | Date | null | undefined>): string {
    return translator(key, values && Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value ?? ""])));
  }
  function translateContent(key: MessageKey, values: Record<string, ReactNode>): ReactNode {
    return translator.rich(key, Object.fromEntries(Object.entries(values).map(([name, value]) => [name, () => value])));
  }
  return {locale, translate, translateContent, format: createFormatter({locale, timeZone})};
}
export type Translation = ReturnType<typeof createTranslation>;
export type MessageKey = Parameters<Translation['translate']>[0];
