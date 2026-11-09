import type { ComponentProps } from "react";

export function TextField({ label, error, id, ...props }: ComponentProps<"input"> & {
  label: string;
  error?: string;
  id: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-body font-bold">{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-12 w-full min-w-0 rounded-control border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted disabled:cursor-wait disabled:bg-surface-muted aria-invalid:border-danger"
      />
      {error && <p id={`${id}-error`} role="alert" className="text-caption font-medium text-foreground">{error}</p>}
    </div>
  );
}
