import type { ReactNode } from "react";

export function StatePanel({
  title,
  description,
  action,
  live = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  live?: boolean;
}) {
  return (
    <section
      className="w-full max-w-xl rounded-card bg-surface p-6 shadow-card sm:p-8"
      aria-live={live ? "polite" : undefined}
      aria-atomic={live ? true : undefined}
    >
      <h1 className="text-title font-extrabold tracking-tight">{title}</h1>
      <p className="mt-3 text-body text-muted">{description}</p>
      {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
    </section>
  );
}
