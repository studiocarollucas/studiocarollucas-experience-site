import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-line bg-white px-6 py-16 text-center">
      <p className="font-serif text-lg font-light text-ink">{title}</p>
      {description ? <p className="mt-1 font-sans text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
