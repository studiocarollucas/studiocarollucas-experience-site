import type { ReactNode } from "react";
import { getJourney } from "@/domain/portal/journey";
import type { PortalSnapshot } from "@/domain/portal/read";
import { summarizePortalMoney, summarizePortalPreparation } from "@/domain/portal/summary";
import { formatBRL, formatShootDate } from "@/lib/format";

const PAYMENT_LABEL = {
  nao_iniciado: "Pagamento pendente",
  parcial: "Pagamento parcial",
  pago: "Pagamento concluído",
} as const;

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-4 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5">
      <dt className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="min-w-0 font-sans text-sm leading-6 text-ink sm:text-right">{children}</dd>
    </div>
  );
}

function Chapter({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  const headingId = `shoot-chapter-${number}`;
  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-5 border-t border-line pt-6 md:grid-cols-[8rem_minmax(0,1fr)] md:gap-10"
    >
      <div>
        <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-muted">
          Capítulo {number}
        </p>
        <h2 id={headingId} className="mt-2 font-serif text-2xl font-light sm:text-3xl">
          {title}
        </h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function MyShoot({
  snapshot,
  contactUrl,
}: {
  snapshot: PortalSnapshot;
  contactUrl?: string;
}) {
  if (!snapshot.shoot) {
    return (
      <section aria-labelledby="my-shoot-title" className="mx-auto max-w-2xl py-12 md:py-20">
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">
          Sua experiência
        </p>
        <h1 id="my-shoot-title" className="mt-3 font-serif text-4xl font-light sm:text-5xl">
          Meu ensaio
        </h1>
        <p className="mt-5 max-w-lg font-sans text-base leading-7 text-muted">
          Quando os detalhes forem liberados pelo estúdio, data, local e informações da sua
          experiência aparecerão aqui.
        </p>
      </section>
    );
  }

  const shoot = snapshot.shoot;
  const experience = snapshot.experience;
  const journey = getJourney(shoot.status);
  const preparation = summarizePortalPreparation(snapshot.tasks);
  const money = summarizePortalMoney(shoot.agreedPrice, snapshot.payments);
  const hasLogistics = Boolean(
    shoot.locationName || shoot.locationAddress || shoot.clientGuidance,
  );

  return (
    <article aria-labelledby="my-shoot-title" className="space-y-10 md:space-y-14">
      <header className="grid gap-6 border-b border-line pb-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">
            {snapshot.client.name} · {journey.label}
          </p>
          <h1
            id="my-shoot-title"
            className="mt-3 font-serif text-4xl leading-none font-light sm:text-5xl md:text-6xl"
          >
            Meu ensaio
          </h1>
        </div>
        <p className="max-w-sm border-l-2 border-ink pl-4 font-sans text-sm leading-6 text-muted">
          {journey.tip}
        </p>
      </header>

      <Chapter number="01" title="Data e horário">
        <dl>
          <DetailRow label="Data">{formatShootDate(shoot.shootDate)}</DetailRow>
          <DetailRow label="Horário">
            {shoot.startTime ? shoot.startTime.slice(0, 5) : "Confirme com o estúdio"}
          </DetailRow>
        </dl>
      </Chapter>

      <Chapter number="02" title="Sua experiência">
        {experience ? (
          <dl>
            <DetailRow label="Experiência">{experience.name}</DetailRow>
            <DetailRow label="Duração">{experience.durationMinutes} minutos</DetailRow>
            <DetailRow label="Imagens incluídas">{experience.includedPhotos}</DetailRow>
            <DetailRow label="Cenários">{experience.scenes ?? "A definir"}</DetailRow>
            <DetailRow label="Produção de maquiagem">
              {experience.makeIncluded ? "Incluída" : "Não incluída"}
            </DetailRow>
            <DetailRow label="Figurinos">
              {experience.outfitsLimit ? `Até ${experience.outfitsLimit}` : "A combinar"}
            </DetailRow>
            <DetailRow label="Clutch e acessórios">
              {experience.clutchIncluded ? "Incluídos" : "Não incluídos"}
            </DetailRow>
            <DetailRow label="Preparação">
              {preparation.done} de {preparation.total} etapas concluídas
            </DetailRow>
          </dl>
        ) : (
          <p className="font-sans text-sm leading-6 text-muted">
            Os detalhes da sua experiência estão sendo preparados pelo estúdio.
          </p>
        )}
      </Chapter>

      <Chapter number="03" title="Local e orientações">
        {hasLogistics ? (
          <dl>
            {shoot.locationName ? <DetailRow label="Local">{shoot.locationName}</DetailRow> : null}
            {shoot.locationAddress ? (
              <DetailRow label="Endereço / ponto de encontro">{shoot.locationAddress}</DetailRow>
            ) : null}
            {shoot.clientGuidance ? (
              <DetailRow label="Orientações">{shoot.clientGuidance}</DetailRow>
            ) : null}
          </dl>
        ) : (
          <p className="font-sans text-sm leading-6 text-muted">Confirme com o estúdio</p>
        )}
      </Chapter>

      <Chapter number="04" title="Financeiro">
        <dl>
          <DetailRow label="Valor contratado">{formatBRL(money.agreed)}</DetailRow>
          <DetailRow label="Pago">{formatBRL(money.paid)}</DetailRow>
          <DetailRow label="Saldo">{formatBRL(money.balance)}</DetailRow>
          <DetailRow label="Status">{PAYMENT_LABEL[money.status]}</DetailRow>
        </dl>
      </Chapter>

      <footer className="border-t border-line pt-8">
        {contactUrl ? (
          <a
            href={contactUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-6 py-3 text-center font-sans text-[10px] uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-transparent hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Falar com o estúdio
          </a>
        ) : (
          <p className="max-w-lg font-sans text-sm leading-6 text-muted">
            Se precisar de ajuda, use o contato habitual do estúdio.
          </p>
        )}
      </footer>
    </article>
  );
}
