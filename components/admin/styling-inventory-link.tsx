"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { linkStylingReferenceToInventoryItemAction } from "@/app/admin/(protected)/agenda/[id]/styling-actions";
import type { PortalReference } from "@/domain/portal/types";

export type StylingInventoryOption = NonNullable<PortalReference["inventoryLink"]>;

export function StylingInventoryLink({ shootId, referenceId, label, value, items }: {
  shootId: string;
  referenceId: string;
  label: string;
  value: string | null;
  items: StylingInventoryOption[];
}) {
  const selectId = useId();
  const feedbackId = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const inventoryItemId = String(new FormData(event.currentTarget).get("inventoryItemId") || "") || null;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await linkStylingReferenceToInventoryItemAction({ shootId, referenceId, inventoryItemId });
        if (!result.ok) { setFeedback({ ok: false, message: result.error }); return; }
        setFeedback({ ok: true, message: inventoryItemId ? "Vínculo salvo." : "Vínculo removido." });
        router.refresh();
      } catch {
        setFeedback({ ok: false, message: "Não foi possível salvar o vínculo. Tente novamente." });
      }
    });
  }

  // An unreserved/stale item must not remain selected or offered as a valid link.
  const selected = items.some((item) => item.inventoryItemId === value) ? value ?? "" : "";
  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t border-line pt-3">
      <label htmlFor={selectId} className="block font-sans text-xs text-muted">Peça ligada a {label}</label>
      <select
        key={selected} id={selectId} name="inventoryItemId" defaultValue={selected}
        disabled={pending} aria-describedby={feedback ? feedbackId : undefined}
        className="min-h-11 w-full rounded border border-line bg-white px-3 py-2 font-sans text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
      >
        <option value="">Sem vínculo</option>
        {items.map((item) => <option key={item.inventoryItemId} value={item.inventoryItemId}>
          {item.itemName} · {item.reservationState === "confirmed" ? "Reserva confirmada" : "Preferência da cliente"}
        </option>)}
      </select>
      <button
        type="submit" disabled={pending}
        className="min-h-11 border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
      >{pending ? "Salvando vínculo…" : "Salvar vínculo"}</button>
      {feedback ? <p id={feedbackId} role={feedback.ok ? "status" : "alert"} className="font-sans text-xs leading-5 text-ink">{feedback.message}</p> : null}
    </form>
  );
}
