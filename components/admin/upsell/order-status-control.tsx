"use client";

import { useState, useTransition } from "react";
import type { UpsellOrderStatus } from "@/db/schema/upsell";
import { changeUpsellOrderStatusAction } from "@/domain/upsell/actions";
import { upsellOrderStatusLabels } from "@/domain/upsell/labels";

const ACTION_LABELS: Record<UpsellOrderStatus, string> = {
  solicitado: "Voltar para solicitado",
  confirmado: "Confirmar pedido",
  em_producao: "Iniciar produção",
  entregue: "Marcar como entregue",
  cancelado: "Cancelar pedido",
};

export function UpsellOrderStatusControl({
  orderId,
  status,
  nextStatuses,
}: {
  orderId: string;
  status: UpsellOrderStatus;
  nextStatuses: readonly UpsellOrderStatus[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: UpsellOrderStatus) {
    if (next === "cancelado" && !window.confirm("Cancelar este pedido?")) return;
    setError(null);
    startTransition(async () => {
      const result = await changeUpsellOrderStatusAction({ orderId, status: next });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-sans text-sm text-muted">
        Status do pedido: <strong className="font-normal text-ink">{upsellOrderStatusLabels[status]}</strong>
      </p>
      {nextStatuses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((next) => (
            <button
              key={next}
              type="button"
              disabled={pending}
              onClick={() => change(next)}
              className={
                next === "cancelado"
                  ? "border border-danger px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-danger disabled:opacity-50"
                  : "border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink disabled:opacity-50"
              }
            >
              {ACTION_LABELS[next]}
            </button>
          ))}
        </div>
      ) : (
        <p className="font-sans text-xs text-muted">Pedido encerrado.</p>
      )}
      {error ? (
        <p role="alert" className="font-sans text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
