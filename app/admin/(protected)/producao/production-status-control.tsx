"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeProductionStatusAction } from "@/domain/production/actions";
import { allowedProductionTransitions, type ProductionJobStatus } from "@/domain/production/status";
import { Badge } from "@/components/ui/badge";

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
  const options = allowedProductionTransitions(status as ProductionJobStatus);

  function move(to: string) {
    startTransition(async () => {
      const result = await changeProductionStatusAction({ jobId, to });
      if (result.ok) router.refresh();
      else alert(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Badge tone="active">{LABELS[status] ?? status}</Badge>
      {options.length > 0 ? (
        <select
          disabled={pending}
          defaultValue=""
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
  );
}
