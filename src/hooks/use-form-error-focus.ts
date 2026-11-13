"use client";
import { useEffect, useRef } from "react";
import type { FieldErrors, FieldPath, FieldValues, UseFormSetFocus } from "react-hook-form";

export function useFormErrorFocus<T extends FieldValues>(errors: FieldErrors<T>, pending: boolean, setFocus: UseFormSetFocus<T>, fields: readonly FieldPath<T>[]) {
  const summary = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (pending) return;
    const field = fields.find((name) => Object.hasOwn(errors, name));
    if (field) setFocus(field);
    else if (errors.root?.server) summary.current?.focus();
  }, [errors, pending, setFocus, fields]);
  return summary;
}
