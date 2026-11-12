import { createTranslator, createFormatter } from 'next-intl';
import { activeMessages as messages } from './catalog.generated';
import { activeLocale, timeZone } from './config';
import type {} from './types';
import type { ReactNode } from 'react';

// The application currently has a single active locale. This pure translator is
// also usable by schemas and view models outside React, including module constants.
// Both this module and request.ts use the generated deployment locale registry.
const translator = createTranslator({locale: activeLocale, messages, timeZone});
export type MessageKey = Parameters<typeof translator>[0];
export function translate(key: MessageKey, values?: Record<string, string | number | Date | null | undefined>): string {
  return translator(key, values && Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value ?? ""])));
}
export function translateContent(key: MessageKey, values: Record<string, ReactNode>): ReactNode {
  return translator.rich(key, Object.fromEntries(Object.entries(values).map(([name, value]) => [name, () => value])));
}
export const format = createFormatter({locale: activeLocale, timeZone});
