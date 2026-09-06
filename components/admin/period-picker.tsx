"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: "from" | "to", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 font-sans text-sm">
      <label className="text-muted">De</label>
      <input
        type="date"
        value={params.get("from") ?? ""}
        onChange={(e) => set("from", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
      />
      <label className="text-muted">até</label>
      <input
        type="date"
        value={params.get("to") ?? ""}
        onChange={(e) => set("to", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
      />
    </div>
  );
}
