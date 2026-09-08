"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { leadStatusValues } from "@/domain/leads/schema";

export function LeadFilterBar({ owners }: { owners: { id: string; name: string }[] }) {
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
        aria-label="Status"
        value={params.get("status") ?? ""}
        onChange={(event) => setParam("status", event.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
      >
        <option value="">Todos os status</option>
        {leadStatusValues.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <input
        aria-label="Origem"
        type="search"
        value={params.get("source") ?? ""}
        onChange={(event) => setParam("source", event.target.value.trim())}
        placeholder="Origem"
        className="border border-line bg-white px-3 py-2 text-ink"
      />
      <select
        aria-label="Responsável"
        value={params.get("ownerId") ?? ""}
        onChange={(event) => setParam("ownerId", event.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
      >
        <option value="">Todos os responsáveis</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.name}
          </option>
        ))}
      </select>
    </div>
  );
}
