"use client";

import { useActionState, useState } from "react";
import { submitPublicClutchRentalReservationAction, type PublicClutchReservationActionState } from "@/app/(site)/paixao-clutch/[slug]/reservation-actions";
import { studioDate } from "@/domain/portal/countdown";
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

function formatReservationExpiry(expiresAt: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(expiresAt));
}

export function PaixaoClutchReservationForm({ slug, name }: { slug: string; name: string }) {
  const action = submitPublicClutchRentalReservationAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, null);
  const [values, setValues] = useState<Record<FieldName, string>>({
    startsOn: "",
    endsOn: "",
    guestName: "",
    guestPhone: "",
    guestEmail: "",
  });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const errors: FieldErrors = {
    startsOn: errorFor(state, clientErrors, "startsOn"),
    endsOn: errorFor(state, clientErrors, "endsOn"),
    guestName: errorFor(state, clientErrors, "guestName"),
    guestPhone: errorFor(state, clientErrors, "guestPhone"),
    guestEmail: errorFor(state, clientErrors, "guestEmail"),
  };

  function updateValue(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function validateDates() {
    if (values.startsOn && values.endsOn && values.endsOn < values.startsOn) {
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
          Pedido recebido. Ele fica reservado para análise até {formatReservationExpiry(state.expiresAt)}.
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
              value={values.startsOn}
              required
              aria-invalid={Boolean(errors.startsOn)}
              aria-describedby={errors.startsOn ? fieldIds.startsOn : undefined}
              onChange={(event) => updateValue("startsOn", event.target.value)}
            />
          </label>
          {errors.startsOn ? <p id={fieldIds.startsOn} role="alert">{errors.startsOn}</p> : null}
          <label htmlFor="endsOn">Data de devolução
            <input
              id="endsOn"
              name="endsOn"
              type="date"
              min={values.startsOn || studioDate()}
              value={values.endsOn}
              required
              aria-invalid={Boolean(errors.endsOn)}
              aria-describedby={errors.endsOn ? fieldIds.endsOn : undefined}
              onChange={(event) => updateValue("endsOn", event.target.value)}
            />
          </label>
          {errors.endsOn ? <p id={fieldIds.endsOn} role="alert">{errors.endsOn}</p> : null}
        </div>
        <label htmlFor="guestName">Nome completo
          <input id="guestName" name="guestName" autoComplete="name" required value={values.guestName} aria-invalid={Boolean(errors.guestName)} aria-describedby={errors.guestName ? fieldIds.guestName : undefined} onChange={(event) => updateValue("guestName", event.target.value)} />
        </label>
        {errors.guestName ? <p id={fieldIds.guestName} role="alert">{errors.guestName}</p> : null}
        <label htmlFor="guestPhone">WhatsApp
          <input id="guestPhone" name="guestPhone" type="tel" autoComplete="tel" required value={values.guestPhone} aria-invalid={Boolean(errors.guestPhone)} aria-describedby={errors.guestPhone ? `guestPhone-hint ${fieldIds.guestPhone}` : "guestPhone-hint"} onChange={(event) => updateValue("guestPhone", event.target.value)} />
        </label>
        <p id="guestPhone-hint">WhatsApp brasileiro com DDD, com ou sem o código 55. Ex.: (92) 99999-0000.</p>
        {errors.guestPhone ? <p id={fieldIds.guestPhone} role="alert">{errors.guestPhone}</p> : null}
        <label htmlFor="guestEmail">E-mail (opcional)
          <input id="guestEmail" name="guestEmail" type="email" autoComplete="email" value={values.guestEmail} aria-invalid={Boolean(errors.guestEmail)} aria-describedby={errors.guestEmail ? fieldIds.guestEmail : undefined} onChange={(event) => updateValue("guestEmail", event.target.value)} />
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
