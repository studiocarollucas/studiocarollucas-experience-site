"use client";

import { useActionState, useState } from "react";
import { submitPublicClutchRentalReservationAction, type PublicClutchReservationActionState } from "@/app/(site)/paixao-clutch/[slug]/reservation-actions";
import { studioDate } from "@/domain/portal/countdown";
import { formatDateTime } from "@/lib/format";
import { contactUrl } from "@/lib/site/contact";
import { PaixaoClutchWhatsAppLink } from "@/components/site/paixao-clutch-tracked-links";
import s from "@/app/(site)/paixao-clutch/paixao-clutch.module.css";

type FieldName = "startsOn" | "endsOn" | "guestName" | "guestPhone" | "guestEmail";
type FieldErrors = Partial<Record<FieldName, string>>;

const fieldIds: Record<FieldName, string> = {
  startsOn: "startsOn-error",
  endsOn: "endsOn-error",
  guestName: "guestName-error",
  guestPhone: "guestPhone-error",
  guestEmail: "guestEmail-error",
};

function errorFor(state: PublicClutchReservationActionState, clientErrors: FieldErrors, field: FieldName) {
  return clientErrors[field] ?? (state && !state.ok ? state.fieldErrors?.[field] : undefined);
}

export function PaixaoClutchReservationForm({ slug, name }: { slug: string; name: string }) {
  const action = submitPublicClutchRentalReservationAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, null);
  const [dates, setDates] = useState({ startsOn: "", endsOn: "" });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const errors: FieldErrors = {
    startsOn: errorFor(state, clientErrors, "startsOn"),
    endsOn: errorFor(state, clientErrors, "endsOn"),
    guestName: errorFor(state, clientErrors, "guestName"),
    guestPhone: errorFor(state, clientErrors, "guestPhone"),
    guestEmail: errorFor(state, clientErrors, "guestEmail"),
  };

  function validateDates() {
    if (dates.startsOn && dates.endsOn && dates.endsOn < dates.startsOn) {
      setClientErrors({ endsOn: "A devolução deve ser igual ou posterior à retirada." });
      return false;
    }
    setClientErrors({});
    return true;
  }

  if (state?.ok) {
    return (
      <section className={s.reservationForm} aria-labelledby="reserva-clutch">
        <h2 id="reserva-clutch">Pedido de reserva enviado</h2>
        <p role="status" aria-live="polite">
          Pedido recebido. Protocolo {state.reservationCode}. Ele fica reservado para análise até {formatDateTime(state.expiresAt)}.
        </p>
        <p>O pedido não inclui pagamento e depende da confirmação do estúdio.</p>
      </section>
    );
  }

  return (
    <section className={s.reservationForm} aria-labelledby="reserva-clutch">
      <h2 id="reserva-clutch">Reservar esta clutch</h2>
      <p>Envie seu pedido e o estúdio confirma a disponibilidade antes de qualquer pagamento.</p>
      <form
        action={formAction}
        noValidate
        onSubmit={(event) => {
          if (!validateDates()) event.preventDefault();
        }}
      >
        <div className={s.reservationDates}>
          <label htmlFor="startsOn">Data de retirada
            <input
              id="startsOn"
              name="startsOn"
              type="date"
              min={studioDate()}
              required
              aria-invalid={Boolean(errors.startsOn)}
              aria-describedby={errors.startsOn ? fieldIds.startsOn : undefined}
              onChange={(event) => setDates((current) => ({ ...current, startsOn: event.target.value }))}
            />
          </label>
          {errors.startsOn ? <p id={fieldIds.startsOn} role="alert">{errors.startsOn}</p> : null}
          <label htmlFor="endsOn">Data de devolução
            <input
              id="endsOn"
              name="endsOn"
              type="date"
              min={dates.startsOn || studioDate()}
              required
              aria-invalid={Boolean(errors.endsOn)}
              aria-describedby={errors.endsOn ? fieldIds.endsOn : undefined}
              onChange={(event) => setDates((current) => ({ ...current, endsOn: event.target.value }))}
            />
          </label>
          {errors.endsOn ? <p id={fieldIds.endsOn} role="alert">{errors.endsOn}</p> : null}
        </div>
        <label htmlFor="guestName">Nome completo
          <input id="guestName" name="guestName" autoComplete="name" required aria-invalid={Boolean(errors.guestName)} aria-describedby={errors.guestName ? fieldIds.guestName : undefined} />
        </label>
        {errors.guestName ? <p id={fieldIds.guestName} role="alert">{errors.guestName}</p> : null}
        <label htmlFor="guestPhone">WhatsApp
          <input id="guestPhone" name="guestPhone" type="tel" autoComplete="tel" required aria-invalid={Boolean(errors.guestPhone)} aria-describedby={errors.guestPhone ? fieldIds.guestPhone : undefined} />
        </label>
        {errors.guestPhone ? <p id={fieldIds.guestPhone} role="alert">{errors.guestPhone}</p> : null}
        <label htmlFor="guestEmail">E-mail (opcional)
          <input id="guestEmail" name="guestEmail" type="email" autoComplete="email" aria-invalid={Boolean(errors.guestEmail)} aria-describedby={errors.guestEmail ? fieldIds.guestEmail : undefined} />
        </label>
        {errors.guestEmail ? <p id={fieldIds.guestEmail} role="alert">{errors.guestEmail}</p> : null}
        {state && !state.ok && !state.fieldErrors ? <p role="alert" aria-live="assertive">{state.message}</p> : null}
        <button type="submit" disabled={pending}>{pending ? "Enviando pedido…" : "Enviar pedido de reserva"}</button>
      </form>
      <PaixaoClutchWhatsAppLink href={contactUrl(`Paixão Clutch: ${name}`)} target="_blank" rel="noreferrer">
        Consultar pelo WhatsApp <span aria-hidden="true">↗</span>
      </PaixaoClutchWhatsAppLink>
    </section>
  );
}
