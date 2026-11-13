import { locales } from './catalog.generated';
export { locales };
export const backendLanguages = ['ko', 'en', 'vi', 'zh', 'km'] as const;
export type BackendLanguage = typeof backendLanguages[number];
export type Locale = typeof locales[number];
export const defaultLocale = 'ko' as const;
// Backend codes, native names and presentation locales have one owner.
export const languageCatalog = {
  ko: {name: '한국어', intlLocale: 'ko-KR'},
  en: {name: 'English', intlLocale: 'en-US'},
  zh: {name: '简体中文', intlLocale: 'zh-CN'},
  vi: {name: 'Tiếng Việt', intlLocale: 'vi-VN'},
  km: {name: 'ភាសាខ្មែរ', intlLocale: 'km-KH'},
} satisfies Record<BackendLanguage, {name: string; intlLocale: string}>;
export const timeZone = 'Asia/Seoul';
export const localePrefix = 'never';
export const localeCookie = 'wageitda-ui-locale';
export function resolveLocale(language: unknown): Locale {
  return locales.includes(language as Locale) ? language as Locale : defaultLocale;
}
// Presentation hint only, never the saved preference. No persistent expiry.
export function syncLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookie}=${locale}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}
