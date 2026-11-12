// One application locale, independent of URLs. No locale negotiation or redirects.
export const defaultLocale = "ko" as const;
export { activeLocale, locales } from './catalog.generated';
import { locales } from './catalog.generated';
export type Locale = (typeof locales)[number];
export const timeZone = "Asia/Seoul";
export const localePrefix = "never";
