"use client";

import { useActionState } from "react";
import { NewShootForm } from "@/app/admin/(protected)/agenda/novo/new-shoot-form";
import { convertLeadAction, createLeadShootAction } from "@/app/admin/(protected)/leads/[id]/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import type { ClientCandidate } from "@/domain/leads/conversion";

export function LeadConversion({
  leadId,
  candidates,
  packages,
}: {
  leadId: string;
  candidates: ClientCandidate[];
  packages: { id: string; name: string; familyName: string }[];
}) {
  const [state, formAction] = useActionState(
    toFormAction(convertLeadAction),
    null as ActionResult<{ clientId: string }> | null,
  );

  if (state?.ok) {
    return (
      <section className="border border-line p-5">
        <h2 className="font-serif text-xl text-ink">Cliente vinculado</h2>
        <p className="mt-2 font-sans text-sm text-muted">A conversão foi concluída. Crie o ensaio para esta cliente.</p>
        <div className="mt-5">
          <NewShootForm clients={[]} createAction={createLeadShootAction} leadId={leadId} packages={packages} />
        </div>
      </section>
    );
  }

  return (
    <section className="border border-line p-5">
      <h2 className="font-serif text-xl text-ink">Converter em cliente</h2>
      <p className="mt-2 font-sans text-sm text-muted">Escolha uma cliente existente ou confirme a criação de uma nova ficha.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {candidates.map((candidate) => (
          <form action={formAction} key={candidate.id}>
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="mode" value="existing" />
            <input type="hidden" name="clientId" value={candidate.id} />
            <button type="submit" className="border border-line px-4 py-2 font-sans text-sm text-ink hover:border-ink">
              Usar {candidate.name}
            </button>
          </form>
        ))}
        <form action={formAction}>
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="mode" value="new" />
          <button type="submit" className="border border-ink px-4 py-2 font-sans text-xs uppercase tracking-[0.12em] text-ink hover:bg-ink hover:text-white">
            Criar novo cliente
          </button>
        </form>
      </div>
      {state && !state.ok ? <p className="mt-3 font-sans text-sm text-danger">{state.error}</p> : null}
    </section>
  );
}
