// Message descriptors remain strings only at library boundaries requiring strings.
import type {MessageKey, Translation} from './translate';
import {MessageError} from './message-error';
import {ZodError} from 'zod';
const prefix = '__wageitda_message__:';
export function message(key: MessageKey, values?: Parameters<Translation['translate']>[1]): string {
  return prefix + JSON.stringify([key, values]);
}
export function translateMessage(value: string, translate: Translation['translate']): string {
  if (!value.startsWith(prefix)) return value;
  try {
    const [key, values] = JSON.parse(value.slice(prefix.length)) as [MessageKey, Parameters<Translation['translate']>[1]];
    const localizedValues = values && Object.fromEntries(Object.entries(values).map(([name, entry]) => [name,
      typeof entry === 'string' ? translateMessage(entry, translate) : entry,
    ]));
    return translate(key, localizedValues);
  } catch { return value; }
}
export function errorMessage(error: Error): string {
  if (error instanceof ZodError && error.issues[0]) return error.issues[0].message;
  return error instanceof MessageError ? message(error.messageKey) : error.message;
}
