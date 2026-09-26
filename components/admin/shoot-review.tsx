"use client";

import { useActionState } from "react";
import {
  cancelShootReviewAction,
  completeShootReviewAction,
} from "@/app/admin/(protected)/agenda/[id]/review-actions";
import { DetailRow } from "@/components/admin/detail-section";
import { Badge } from "@/components/ui/badge";
import type { ShootReviewPanel } from "@/domain/reviews/queries";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { formatDateTime } from "@/lib/format";

const STATUS_LABEL = {
  solicitado: "solicitada",
  concluido: "concluída",
  cancelado: "cancelada",
} as const;

const SOURCE_LABEL = {
  automacao: "e-mail automático",
  portal: "Minha Experiência",
  manual: "equipe",
} as const;

function dateOrDash(iso: string | null): string {
  return iso ? formatDateTime(iso) : "—";
}

/**
 * SCL-721: the Google review of this shoot. The request comes from the
 * post-delivery email or from the portal card; the studio cannot see the
 * review on Google, so staff mark it completed (or cancel the request, which
 * also stops the email and the portal card for this shoot).
 */
export function ShootReview({ shootId, panel }: { shootId: string; panel: ShootReviewPanel }) {
  const [completeState, completeAction] = useActionState(
    toFormAction(completeShootReviewAction),
    null as ActionResult<{ reviewId: string }> | null,
  );
  const [cancelState, cancelAction] = useActionState(
    toFormAction(cancelShootReviewAction),
    null as ActionResult<{ reviewId: string }> | null,
  );
  const { review, linkOpenedAt } = panel;

  if (!review) {
    return (
      <p className="font-sans text-sm text-muted">
        Nenhum pedido de avaliação no Google. O pedido sai automaticamente 3 dias após a entrega, com o Reveal
        publicado.
      </p>
    );
  }

  const error = completeState && !completeState.ok ? completeState.error : cancelState && !cancelState.ok ? cancelState.error : null;

  return (
    <div>
      <DetailRow
        label="Avaliação no Google"
        value={
          <Badge tone={review.status === "concluido" ? "success" : review.status === "cancelado" ? "neutral" : "warning"}>
            {STATUS_LABEL[review.status]}
          </Badge>
        }
      />
      <DetailRow label="Origem do pedido" value={SOURCE_LABEL[review.source]} />
      <DetailRow label="Pedido em" value={dateOrDash(review.requestedAt)} />
      <DetailRow label="Cliente abriu o link" value={dateOrDash(linkOpenedAt)} />
      <DetailRow label="Concluída em" value={dateOrDash(review.completedAt)} />

      {review.status === "solicitado" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={completeAction}>
            <input type="hidden" name="shootId" value={shootId} />
            <input type="hidden" name="reviewId" value={review.id} />
            <button
              type="submit"
              className="min-h-11 border border-ink px-4 py-2 font-sans text-xs uppercase tracking-[0.12em] text-ink hover:bg-ink hover:text-white"
            >
              Marcar como concluída
            </button>
          </form>
          <form action={cancelAction}>
            <input type="hidden" name="shootId" value={shootId} />
            <input type="hidden" name="reviewId" value={review.id} />
            <button
              type="submit"
              className="min-h-11 border border-line px-4 py-2 font-sans text-xs uppercase tracking-[0.12em] text-muted hover:border-ink hover:text-ink"
            >
              Cancelar pedido
            </button>
          </form>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 font-sans text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
