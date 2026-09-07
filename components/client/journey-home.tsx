import Link from "next/link";
import { daysUntilShoot } from "@/domain/portal/countdown";
import { getJourney } from "@/domain/portal/journey";
import type { PortalSnapshot } from "@/domain/portal/read";
import { summarizePortalPreparation } from "@/domain/portal/summary";
import { formatShootDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const STAGES = ["Reserva", "Preparação", "Ensaio", "Edição", "Reveal", "Entrega"] as const;

function nextHref(taskType: string | undefined): string {
  return taskType && ["moodboard", "figurino", "clutch", "make"].includes(taskType)
    ? "/minha-experiencia/styling"
    : "/minha-experiencia/checklist";
}

function countdownCopy(days: number): string | null {
  if (days > 0) return `Faltam ${days} dias`;
  if (days === 0) return "É hoje";
  return null;
}

export function JourneyHome({ snapshot, today }: { snapshot: PortalSnapshot; today: string }) {
  if (!snapshot.shoot) {
    return (
      <section aria-label="Minha Experiência" className="mx-auto max-w-2xl py-12 md:py-20">
        <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-muted">
          Olá, {snapshot.client.name}
        </p>
        <h1 className="mt-4 max-w-xl font-serif text-4xl leading-[1.05] font-light sm:text-5xl">
          Estamos preparando seu espaço.
        </h1>
        <p className="mt-5 max-w-lg font-sans text-base leading-7 text-muted">
          Quando seu próximo ensaio for liberado, toda a jornada aparecerá aqui.
        </p>
      </section>
    );
  }

  const journey = getJourney(snapshot.shoot.status);
  const preparation = summarizePortalPreparation(snapshot.tasks);
  const nextTask = preparation.nextTask
    ? snapshot.tasks.find((task) => task.id === preparation.nextTask?.id)
    : undefined;
  const countdown = countdownCopy(daysUntilShoot(snapshot.shoot.shootDate, today));
  const experienceName = snapshot.experience?.name;
  const nextTitle = preparation.nextTask?.title ?? journey.label;
  const nextDestination = nextHref(nextTask?.type);
  const nextLabel = preparation.nextTask?.actionable
    ? "Continuar preparação"
    : nextDestination === "/minha-experiencia/styling"
      ? "Ver styling"
      : "Ver checklist";

  return (
    <section aria-label="Minha Experiência" className="space-y-12 md:space-y-16">
      <header className="grid gap-7 border-b border-line pb-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-muted">
            Olá, {snapshot.client.name}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.02] font-light sm:text-5xl md:text-6xl">
            Sua experiência{experienceName ? ` ${experienceName}` : ""}
          </h1>
        </div>
        <div className="border-l-2 border-ink pl-4 md:min-w-44">
          {countdown ? (
            <p className="font-sans text-xs font-medium uppercase tracking-[0.16em] text-ink">
              {countdown}
            </p>
          ) : null}
          <p className={cn("font-serif text-2xl font-light", countdown && "mt-1")}>
            {formatShootDate(snapshot.shoot.shootDate)}
          </p>
          {snapshot.shoot.startTime ? (
            <p className="mt-1 font-sans text-sm text-muted">
              às {snapshot.shoot.startTime.slice(0, 5)}
            </p>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="journey-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">
              Sua jornada
            </p>
            <h2 id="journey-title" className="mt-2 font-serif text-3xl font-light">
              {journey.label}
            </h2>
          </div>
          <p className="max-w-sm font-sans text-sm leading-6 text-muted">{journey.tip}</p>
        </div>

        <ol
          aria-label="Etapas da sua experiência"
          className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-6"
        >
          {STAGES.map((stage, index) => {
            const step = index + 1;
            const complete = step < journey.step;
            const current = step === journey.step;
            const marker = complete ? "Concluída" : current ? "Etapa atual" : "Próxima etapa";

            return (
              <li
                key={stage}
                className={cn(
                  "min-w-0 bg-cream px-4 py-5",
                  current && "bg-white shadow-[inset_0_3px_0_var(--ink)]",
                )}
              >
                <span className="font-sans text-[9px] uppercase tracking-[0.15em] text-muted">
                  {marker}
                </span>
                <p className={cn("mt-2 font-serif text-xl font-light", current && "font-medium")}>
                  {stage}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section
        aria-labelledby="next-step-title"
        className="grid gap-8 border border-line bg-white p-6 shadow-soft sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
      >
        <div>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">
            Seu próximo passo
          </p>
          <h2 id="next-step-title" className="mt-3 font-serif text-3xl font-light sm:text-4xl">
            {nextTitle}
          </h2>
          <p className="mt-5 font-sans text-sm leading-6 text-muted">
            {preparation.done} de {preparation.total} etapas de preparação concluídas
          </p>
          <div className="mt-3">
            <div
              role="progressbar"
              aria-label="Progresso da preparação"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={preparation.pct}
              className="h-2 bg-champ"
            >
              <div className="h-2 bg-ink" style={{ width: `${preparation.pct}%` }} />
            </div>
          </div>
        </div>
        <Link
          href={nextDestination}
          className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-6 py-3 text-center font-sans text-[10px] uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-transparent hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {nextLabel}
        </Link>
      </section>

      <nav aria-label="Atalhos da experiência" className="grid gap-3 sm:grid-cols-3">
        {[
          ["Checklist", "/minha-experiencia/checklist"],
          ["Meu ensaio", "/minha-experiencia/ensaio"],
          ["Styling", "/minha-experiencia/styling"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-center justify-between border-b border-line py-3 font-sans text-sm text-muted transition-colors duration-200 hover:border-ink hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
