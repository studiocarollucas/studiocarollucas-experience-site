import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Column<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty: ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full border-collapse font-sans text-sm">
        <thead>
          <tr className="border-b border-line bg-champ">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-3 text-left text-[11px] font-normal uppercase tracking-[0.12em] text-muted",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 text-ink", c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
