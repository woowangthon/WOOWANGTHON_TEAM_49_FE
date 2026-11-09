import type { ComponentProps } from "react";

export function SelectField({ label, error, id, children, ...props }: ComponentProps<"select"> & { label: string; error?: string; id: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-body font-bold">{label}</label>
      <select {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="min-h-12 w-full min-w-0 rounded-control border border-border bg-surface px-3 py-3 text-base text-foreground disabled:cursor-wait disabled:bg-surface-muted">
        {children}
      </select>
      {error && <p id={`${id}-error`} role="alert" className="text-caption">{error}</p>}
    </div>
  );
}
