"use client";

import { useActionState } from "react";
import { createShootInventoryReservationAction, cancelShootInventoryReservationAction } from "@/app/admin/(protected)/agenda/[id]/inventory-actions";
import { toFormAction, type ActionResult } from "@/lib/auth/action-result";
import { DetailSection } from "@/components/admin/detail-section";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type Reservation = {
  id: string;
  itemName: string;
  itemCode: string;
  itemType: string;
  startsOn: string;
  endsOn: string;
  status: string;
  overrideReason: string | null;
};

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  released: "Liberada",
};

function ReservationCancelForm({ reservationId, shootId }: { reservationId: string; shootId: string }) {
  const [state, formAction] = useActionState(
    toFormAction(cancelShootInventoryReservationAction),
    null as ActionResult<{ id: string }> | null,
  );
  if (state?.ok) return null;
  return (
    <form action={formAction} className="mt-2">
      <FormStatus state={state} />
      <input type="hidden" name="reservationId" value={reservationId} />
      <input type="hidden" name="shootId" value={shootId} />
      <button type="submit" className="font-sans text-xs text-danger underline-offset-2 hover:underline">
        Cancelar reserva
      </button>
    </form>
  );
}

export function InventoryReservations({
  shootId,
  shootDate,
  reservations = [],
}: {
  shootId: string;
  shootDate: string;
  reservations?: Reservation[];
}) {
  const [state, formAction] = useActionState(
    toFormAction(createShootInventoryReservationAction, { booleans: ["overrideConflict"] }),
    null as ActionResult<{ id: string }> | null,
  );
  const fieldError = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <DetailSection title="Acervo reservado">
      <div className="space-y-3">
        {reservations.length === 0 ? <p className="font-sans text-sm text-muted">Nenhum item reservado para este ensaio.</p> : null}
        {reservations.map((reservation) => (
          <div key={reservation.id} className="border-b border-line pb-3 font-sans text-sm last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-ink"><span className="text-muted">{reservation.itemCode}</span> · {reservation.itemName} <span className="text-muted">({reservation.itemType})</span></p>
              <Badge tone={reservation.status === "confirmed" ? "success" : reservation.status === "cancelled" ? "danger" : "neutral"}>{statusLabel[reservation.status] ?? reservation.status}</Badge>
            </div>
            <p className="mt-1 text-muted">Período: {reservation.startsOn} a {reservation.endsOn}</p>
            {reservation.status === "cancelled" ? <p className="mt-1 text-danger">Reserva cancelada</p> : null}
            {reservation.overrideReason ? <p className="mt-1 text-muted">Exceção: {reservation.overrideReason}</p> : null}
            {reservation.status !== "cancelled" && reservation.status !== "released" ? <ReservationCancelForm reservationId={reservation.id} shootId={shootId} /> : null}
          </div>
        ))}
      </div>

      <form action={formAction} className="mt-5 grid gap-4 border-t border-line pt-5">
        <FormStatus state={state} />
        <input type="hidden" name="shootId" value={shootId} />
        <Field label="Item do acervo" htmlFor="inventoryItemId" hint="Informe o ID do item" error={fieldError("inventoryItemId")}>
          <Input id="inventoryItemId" name="inventoryItemId" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Início" htmlFor="startsOn" error={fieldError("startsOn")}>
            <Input id="startsOn" name="startsOn" type="date" defaultValue={shootDate} required />
          </Field>
          <Field label="Fim" htmlFor="endsOn" error={fieldError("endsOn")}>
            <Input id="endsOn" name="endsOn" type="date" defaultValue={shootDate} required />
          </Field>
        </div>
        <label className="flex items-start gap-2 font-sans text-sm text-ink">
          <input id="overrideConflict" name="overrideConflict" type="checkbox" className="mt-1" />
          <span>Registrar exceção por conflito</span>
        </label>
        <Field label="Motivo da exceção" htmlFor="overrideReason" hint="Obrigatório quando houver exceção" error={fieldError("overrideReason")}>
          <Textarea id="overrideReason" name="overrideReason" />
        </Field>
        <div><SubmitButton>Reservar item</SubmitButton></div>
      </form>
    </DetailSection>
  );
}
