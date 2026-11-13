"use client";
import {useState} from 'react';
import {useTranslation} from './use-translation';
import {translateMessage} from './message';
export function useMessageState<T>(initial: T | (() => T)) {
  const [value, setValue] = useState<T>(initial);
  const {translate} = useTranslation();
  const rendered = typeof value === 'string' ? translateMessage(value, translate) : value;
  return [rendered as T, setValue] as const;
}
