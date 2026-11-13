import type {MessageKey, Translation} from './translate';

/** Store identity, not rendered prose, in long-lived errors and caches. */
export class MessageError extends Error {
  constructor(readonly messageKey: MessageKey) {
    super(messageKey);
    this.name = 'MessageError';
  }
}
export function localizeError(error: Error, translate: Translation['translate']): string {
  return error instanceof MessageError ? translate(error.messageKey) : error.message;
}
