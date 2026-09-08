"use client";

import { useActionState } from "react";
import { transitionLeadStatusAction } from "@/app/admin/(protected)/leads/[id]/actions";
import { Badge } from "@/components/ui/badge";
import type { LeadDetail as LeadDetailData } from "@/domain/leads/detail";
import { canTransitionLeadStatus } from "@/domain/leads/status";
import { leadStatusValues } from "@/domain/leads/schema";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { formatDateTime } from "@/lib/format";

function formatTimestamp(value: string | Date) {
  return formatDateTime(value instanceof Date ? value.toISOString() : value);
}

export function LeadDetail({ lead }: { lead: LeadDetailData }) {
  const nextStatuses = leadStatusValues.filter((status) => canTransitionLeadStatus(lead.status, status));
  const [state, formAction] = useActionState(toFormAction(transitionLeadStatusAction), null as ActionResult<{ id: string }> | null);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 border border-line p-5 sm:grid-cols-2">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.12em] text-muted">Contato</p>
          <p className="mt-1 font-serif text-2xl text-ink">{lead.name ?? "Lead sem nome"}</p>
          <p className="mt-2 font-sans text-sm text-muted">{lead.phone ?? "Telefone não informado"}</p>
          <p className="font-sans text-sm text-muted">{lead.email ?? "E-mail não informado"}</p>
        </div>
        <div className="space-y-2 font-sans text-sm text-muted">
          <p>Origem: <span className="text-ink">{lead.source}</span></p>
          <p>Ocasião: <span className="text-ink">{lead.occasion ?? "Não informada"}</span></p>
          <p>Resultado do quiz: <span className="text-ink">{lead.quizResult ?? "Não informado"}</span></p>
          <p>Responsável: <span className="text-ink">{lead.owner ?? "Sem responsável"}</span></p>
          <p>Entrada: <span className="text-ink">{formatTimestamp(lead.createdAt)}</span></p>
          <Badge tone="active">{lead.status}</Badge>
        </div>
      </section>

      {lead.lostReason ? <p className="font-sans text-sm text-muted">Motivo da perda: {lead.lostReason}</p> : null}

      {nextStatuses.length ? (
        <section className="border border-line p-5">
          <h2 className="font-serif text-xl text-ink">Atualizar status</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {nextStatuses.map((status) => (
              <form action={formAction} key={status}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="status" value={status} />
                {status === "perdido" ? <input name="lostReason" required placeholder="Motivo da perda" className="border border-line px-3 py-2 text-sm" /> : null}
                <button type="submit" className="border border-ink px-4 py-2 font-sans text-xs uppercase tracking-[0.12em] text-ink hover:bg-ink hover:text-white">
                  Marcar como {status}
                </button>
              </form>
            ))}
          </div>
          {state && !state.ok ? <p className="mt-3 font-sans text-sm text-danger">{state.error}</p> : null}
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-xl text-ink">Histórico</h2>
        {lead.audit.length ? (
          <ul className="mt-3 space-y-2 font-sans text-sm text-muted">
            {lead.audit.map((entry) => <li key={entry.id}>{entry.action} · {formatTimestamp(entry.createdAt)}</li>)}
          </ul>
        ) : <p className="mt-3 font-sans text-sm text-muted">Nenhuma alteração registrada.</p>}
      </section>
    </div>
  );
}
