import type { ReactNode } from "react";

export function PageHeading({ title, description, action, variant = "workspace" }: { variant?: "landing" | "auth" | "dashboard" | "workspace" | "library" | "chat"; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className={`heading heading-${variant}`}>{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-body text-muted">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-3">{action}</div>}
    </header>
  );
}
