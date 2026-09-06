"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function FilterBar({
  statusOptions,
}: {
  statusOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 font-sans text-sm">
      <select
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
      >
        <option value="">Todos os status</option>
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={params.get("from") ?? ""}
        onChange={(e) => setParam("from", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
        aria-label="De"
      />
      <input
        type="date"
        value={params.get("to") ?? ""}
        onChange={(e) => setParam("to", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
        aria-label="Até"
      />
    </div>
  );
}
