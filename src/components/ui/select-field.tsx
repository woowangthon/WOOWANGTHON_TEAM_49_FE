import type { ComponentProps } from "react";

export function SelectField({ label, error, hint, className, "aria-describedby": describedBy, id, children, ...props }: ComponentProps<"select"> & { label: string; error?: string; hint?: string; id: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-body font-bold">{label}</label>
      <select {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={[describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined} className={`ui-control ${className ?? ""}`}>
        {children}
      </select>
      {hint && <p id={`${id}-hint`} className="text-caption text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-caption">{error}</p>}
    </div>
  );
}
