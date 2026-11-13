import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { resolveLocale, localeCookie, timeZone } from './config';
import { messageLoaders } from './catalog.generated';
export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(localeCookie)?.value);
  return {locale, messages: await messageLoaders[locale](), timeZone};
});
