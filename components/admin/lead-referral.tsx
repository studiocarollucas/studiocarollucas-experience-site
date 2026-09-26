"use client";

import { useActionState } from "react";
import { removeLeadReferralAction, setLeadReferralAction } from "@/app/admin/(protected)/leads/[id]/actions";
import { Badge } from "@/components/ui/badge";
import type { LeadReferralPanel } from "@/domain/referrals/queries";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { formatDateTime } from "@/lib/format";

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * SCL-722: records which Client referred this Lead. The referral can be chosen,
 * changed or removed while it is only informed; once the Lead is converted it
 * points to the converted Client and becomes read-only here.
 */
export function LeadReferral({ leadId, panel }: { leadId: string; panel: LeadReferralPanel }) {
  const [setState, setAction] = useActionState(
    toFormAction(setLeadReferralAction),
    null as ActionResult<{ leadId: string }> | null,
  );
  const [removeState, removeAction] = useActionState(
    toFormAction(removeLeadReferralAction),
    null as ActionResult<{ leadId: string }> | null,
  );
  const { referral, referrerOptions } = panel;
  const converted = Boolean(referral?.referredClientId);
  const fieldError = setState && !setState.ok ? setState.fieldErrors?.referrerClientId?.[0] : undefined;

  return (
    <section className="border border-line p-5" aria-labelledby="lead-referral-title">
      <h2 id="lead-referral-title" className="font-serif text-xl text-ink">Indicação</h2>
      {referral ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 font-sans text-sm text-muted">
          <span>
            Indicada por <span className="text-ink">{referral.referrerName}</span>
          </span>
          <Badge tone={converted ? "success" : "neutral"}>{converted ? "convertida" : "informada"}</Badge>
          {converted && referral.convertedAt ? <span>desde {formatDateTime(toIso(referral.convertedAt))}</span> : null}
        </p>
      ) : (
        <p className="mt-2 font-sans text-sm text-muted">Nenhuma indicação registrada para este Lead.</p>
      )}

      {converted ? null : (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <form action={setAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="leadId" value={leadId} />
            <label className="flex flex-col gap-1 font-sans text-xs uppercase tracking-[0.12em] text-muted">
              Cliente que indicou
              <select
                name="referrerClientId"
                required
                defaultValue={referral?.referrerClientId ?? ""}
                aria-invalid={fieldError ? true : undefined}
                className="min-h-11 border border-line bg-white px-3 py-2 font-sans text-sm normal-case tracking-normal text-ink"
              >
                <option value="">Selecione a cliente</option>
                {referrerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="min-h-11 border border-ink px-4 py-2 font-sans text-xs uppercase tracking-[0.12em] text-ink hover:bg-ink hover:text-white"
            >
              {referral ? "Trocar indicação" : "Registrar indicação"}
            </button>
          </form>
          {referral ? (
            <form action={removeAction}>
              <input type="hidden" name="leadId" value={leadId} />
              <button
                type="submit"
                className="min-h-11 border border-line px-4 py-2 font-sans text-xs uppercase tracking-[0.12em] text-muted hover:border-ink hover:text-ink"
              >
                Remover indicação
              </button>
            </form>
          ) : null}
        </div>
      )}

      {setState && !setState.ok ? (
        <p role="alert" className="mt-3 font-sans text-sm text-danger">{fieldError ?? setState.error}</p>
      ) : null}
      {removeState && !removeState.ok ? (
        <p role="alert" className="mt-3 font-sans text-sm text-danger">{removeState.error}</p>
      ) : null}
    </section>
  );
}
