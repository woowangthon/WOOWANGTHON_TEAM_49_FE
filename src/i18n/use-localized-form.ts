"use client";
import {useForm as useReactHookForm, type FieldValues, type UseFormProps, type UseFormReturn} from 'react-hook-form';
import {useTranslation} from './use-translation';
import {translateMessage} from './message';
function localizeErrors<T>(value: T, translate: ReturnType<typeof useTranslation>['translate']): T {
  if (!value || typeof value !== 'object') return value;
  if (typeof Element !== 'undefined' && value instanceof Element) return value;
  if (Array.isArray(value)) return value.map(entry => localizeErrors(entry, translate)) as T;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key,
    key === 'ref' ? entry : key === 'message' && typeof entry === 'string' ? translateMessage(entry, translate) : localizeErrors(entry, translate),
  ])) as T;
}
/** Retain RHF values, dirty state and subscriptions while translating existing errors on render. */
export function useForm<T extends FieldValues = FieldValues, C = unknown, O = T>(props?: UseFormProps<T, C, O>): UseFormReturn<T, C, O> {
  const form = useReactHookForm<T, C, O>(props);
  const {translate} = useTranslation();
  return {...form, formState: new Proxy(form.formState, {get(target, property, receiver) {
    const value: unknown = Reflect.get(target, property, receiver);
    return property === 'errors' ? localizeErrors(value, translate) : value;
  }})};
}
