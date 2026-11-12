import type messages from '@/messages/ko';
import type { Locale } from './config';

export type Messages = typeof messages;
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
