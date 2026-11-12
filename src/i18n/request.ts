import { getRequestConfig } from 'next-intl/server';
import { activeLocale, timeZone } from './config';
import { messageLoaders } from './catalog.generated';

export default getRequestConfig(async () => ({
  locale: activeLocale,
  messages: await messageLoaders[activeLocale](),
  timeZone,
}));
