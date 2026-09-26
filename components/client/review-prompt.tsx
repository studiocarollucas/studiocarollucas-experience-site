"use client";

import { useState } from "react";
import {
  dismissReviewPromptAction,
  openReviewLinkAction,
} from "@/app/(client)/minha-experiencia/avaliacao/actions";

type ReviewPromptProps = {
  /** Studio's public Google review link, resolved on the server. */
  reviewUrl: string;
};

/**
 * SCL-721: an optional, inline invitation to review the studio on Google. It
 * is never a modal, never blocks the gallery or downloads, and "Agora não"
 * hides it for good in this browser. The link opens in a new tab; recording the
 * click is best effort and never stops the client from leaving.
 */
export function ReviewPrompt({ reviewUrl }: ReviewPromptProps) {
  const [state, setState] = useState<"open" | "thanks" | "hidden">("open");

  if (state === "hidden") return null;

  function handleOpen() {
    setState("thanks");
    void openReviewLinkAction().catch(() => undefined);
  }

  function handleDismiss() {
    setState("hidden");
    void dismissReviewPromptAction().catch(() => undefined);
  }

  return (
    <aside
      aria-labelledby="review-prompt-title"
      className="mt-12 border border-line bg-white p-6 sm:p-8"
    >
      <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">Sua opinião</p>
      {state === "thanks" ? (
        <>
          <h2 id="review-prompt-title" className="mt-3 font-serif text-2xl font-light sm:text-3xl">
            Obrigada pelo carinho
          </h2>
          <p className="mt-3 max-w-xl font-sans text-sm leading-6 text-muted">
            A avaliação abriu em uma nova aba. Suas fotos continuam aqui, sempre que quiser.
          </p>
          <button
            type="button"
            onClick={() => setState("hidden")}
            className="mt-5 min-h-11 border border-line px-4 py-2 font-sans text-xs uppercase tracking-[0.12em] text-muted hover:border-ink hover:text-ink"
          >
            Fechar
          </button>
        </>
      ) : (
        <>
          <h2 id="review-prompt-title" className="mt-3 font-serif text-2xl font-light sm:text-3xl">
            Conte como foi a sua experiência
          </h2>
          <p className="mt-3 max-w-xl font-sans text-sm leading-6 text-muted">
            Se fizer sentido para você, uma avaliação no Google ajuda outras pessoas a conhecerem o estúdio.
            É opcional e leva só um minuto.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpen}
              className="inline-flex min-h-11 items-center border border-ink bg-ink px-5 py-2 font-sans text-xs uppercase tracking-[0.12em] text-cream hover:bg-transparent hover:text-ink"
            >
              Avaliar no Google
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-11 border border-line px-4 py-2 font-sans text-xs uppercase tracking-[0.12em] text-muted hover:border-ink hover:text-ink"
            >
              Agora não
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
