"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ClientHomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <section aria-labelledby="client-home-error-title" className="mx-auto max-w-xl py-12 md:py-20">
      <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">
        Minha Experiência
      </p>
      <h1
        id="client-home-error-title"
        className="mt-4 font-serif text-4xl leading-tight font-light"
      >
        Não conseguimos carregar sua experiência.
      </h1>
      <p className="mt-4 font-sans text-base leading-7 text-muted">
        Tente novamente. Se o problema continuar, fale com o estúdio.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-11 cursor-pointer items-center justify-center border border-ink bg-ink px-6 py-3 font-sans text-[10px] uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-transparent hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Tentar novamente
      </button>
    </section>
  );
}
