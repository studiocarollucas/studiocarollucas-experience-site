"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeProductionStatusAction } from "@/domain/production/actions";
import { allowedProductionTransitions, type ProductionJobStatus } from "@/domain/production/status";
import { Badge } from "@/components/ui/badge";
import { FormStatus } from "@/components/admin/form-status";

const LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  iniciado: "Iniciado",
  parcial: "Parcial",
  finalizado: "Finalizado",
  entregue: "Entregue",
};

export function ProductionStatusControl({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const options = allowedProductionTransitions(status as ProductionJobStatus);

  function move(to: string) {
    setError(null);
    startTransition(async () => {
      const result = await changeProductionStatusAction({ jobId, to });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge tone="active">{LABELS[status] ?? status}</Badge>
        {options.length > 0 ? (
          <select
            aria-label="Mover job para outro status"
            disabled={pending}
            value=""
            onChange={(e) => e.target.value && move(e.target.value)}
            className="border border-line bg-white px-2 py-1 font-sans text-xs text-ink disabled:opacity-50"
          >
            <option value="">Mover para…</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {LABELS[o]}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <FormStatus state={error ? { ok: false, error } : null} />
    </div>
  );
}
