import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">{title}</h1>
        {description ? <p className="mt-1 font-sans text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
