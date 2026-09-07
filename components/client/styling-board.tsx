"use client";

import * as Sentry from "@sentry/nextjs";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PortalReference } from "@/domain/portal/types";
import {
  deleteStylingReference,
  uploadStylingReference,
  type StylingMutationClient,
} from "@/domain/styling/client";
import { MAX_STYLING_REFERENCES } from "@/domain/styling/schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Feedback = { kind: "status" | "alert"; message: string } | null;

const SAFE_UPLOAD_MESSAGES = new Set([
  "Envie uma imagem JPG, PNG ou WebP.",
  "A imagem deve ter no máximo 8 MB.",
  "Este ensaio já possui 20 referências.",
]);

function uploadFeedback(error: unknown) {
  if (error instanceof Error && SAFE_UPLOAD_MESSAGES.has(error.message)) return error.message;
  return "Não foi possível adicionar esta referência.";
}

export function StylingBoard({
  shootId,
  viewerAuthUserId,
  references,
  origin = "client",
  canDeleteAll = false,
}: {
  shootId: string;
  viewerAuthUserId: string;
  references: PortalReference[];
  origin?: "client" | "studio";
  canDeleteAll?: boolean;
}) {
  const router = useRouter();
  const client = useMemo(
    () => createSupabaseBrowserClient() as unknown as StylingMutationClient,
    []
  );
  const [pending, setPending] = useState<"upload" | string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const visibleReferences = references.filter((reference) => !removedIds.has(reference.id));
  const reachedLimit = visibleReferences.length >= MAX_STYLING_REFERENCES;

  async function submitReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("stylingFile");
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;
    if (!file || file.size === 0) {
      setFeedback({ kind: "alert", message: "Escolha uma imagem para continuar." });
      return;
    }

    setFeedback(null);
    setPending("upload");
    try {
      await uploadStylingReference(client, {
        file,
        shootId,
        authUserId: viewerAuthUserId,
        caption: String(formData.get("caption") ?? ""),
        origin,
        currentCount: visibleReferences.length,
      });
      form.reset();
      setFeedback({ kind: "status", message: "Referência adicionada." });
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "alert", message: uploadFeedback(error) });
    } finally {
      setPending(null);
    }
  }

  async function removeReference(reference: PortalReference) {
    setFeedback(null);
    setPending(reference.id);
    try {
      await deleteStylingReference(client, reference.id);
      setRemovedIds((current) => new Set(current).add(reference.id));
      setFeedback({ kind: "status", message: "Referência removida." });
      router.refresh();
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: "styling-reference-delete" } });
      setFeedback({ kind: "alert", message: "Não foi possível remover esta referência." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={(event) => void submitReference(event)}
        className="grid gap-5 border-y border-line bg-white px-4 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:px-6"
      >
        <div className="min-w-0">
          <label
            htmlFor="stylingFile"
            className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted"
          >
            Escolher imagem
          </label>
          <input
            id="stylingFile"
            name="stylingFile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={pending !== null || reachedLimit}
            className="mt-2 block min-h-11 w-full cursor-pointer border border-line bg-cream px-3 py-2 font-sans text-sm text-ink file:mr-3 file:border-0 file:bg-transparent file:font-sans file:text-xs file:font-medium file:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div className="min-w-0">
          <label
            htmlFor="stylingCaption"
            className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted"
          >
            Legenda <span className="normal-case tracking-normal">(opcional)</span>
          </label>
          <input
            id="stylingCaption"
            name="caption"
            type="text"
            maxLength={500}
            disabled={pending !== null || reachedLimit}
            placeholder="O que chamou sua atenção?"
            className="mt-2 min-h-11 w-full border border-line bg-cream px-3 py-2 font-sans text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={pending !== null || reachedLimit}
          className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-transparent hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          Adicionar referência
        </button>
        <p className="font-sans text-xs leading-5 text-muted sm:col-span-3">
          JPG, PNG ou WebP · até 8 MB · 20 imagens por ensaio.
        </p>
      </form>

      {feedback ? (
        <p
          role={feedback.kind}
          className={
            feedback.kind === "alert"
              ? "border border-danger px-4 py-3 font-sans text-sm text-danger"
              : "border border-line px-4 py-3 font-sans text-sm text-ink"
          }
        >
          {feedback.message}
        </p>
      ) : pending === "upload" ? (
        <p role="status" className="font-sans text-sm text-muted">
          Enviando referência…
        </p>
      ) : null}

      {visibleReferences.length === 0 ? (
        <section className="border-l-2 border-ink py-3 pl-5" aria-labelledby="styling-empty-title">
          <h2 id="styling-empty-title" className="font-serif text-2xl font-light text-ink">
            Seu olhar começa aqui.
          </h2>
          <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-muted">
            Adicione imagens que ajudem a contar o clima, as cores e os detalhes que você imagina
            para o ensaio.
          </p>
        </section>
      ) : (
        <ol className="grid list-none gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {visibleReferences.map((reference, index) => {
            const canDelete =
              canDeleteAll ||
              (reference.origin === "client" &&
                reference.uploadedByAuthUserId === viewerAuthUserId);
            const removeLabel = reference.caption
              ? `Remover referência ${reference.caption}`
              : reference.origin === "studio"
                ? "Remover referência do estúdio"
                : "Remover referência";

            return (
              <li key={reference.id} className="min-w-0 border-t border-line pt-3">
                <div className="mb-3 flex items-center justify-between gap-3 font-sans text-[10px] uppercase tracking-[0.16em] text-muted">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{reference.origin === "studio" ? "Estúdio" : "Você"}</span>
                </div>
                <div className="aspect-[4/5] overflow-hidden bg-rose3">
                  {/* Signed private Supabase URLs are short-lived and their host is intentionally not in next/image config. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reference.signedUrl}
                    alt={reference.caption ?? "Referência de styling"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-3 flex min-h-11 items-start justify-between gap-3">
                  <p className="min-w-0 font-sans text-sm leading-5 text-ink">
                    {reference.caption ?? "Sem legenda"}
                  </p>
                  {canDelete ? (
                    <button
                      type="button"
                      aria-label={removeLabel}
                      disabled={pending !== null}
                      onClick={() => void removeReference(reference)}
                      className="inline-flex min-h-11 shrink-0 items-center px-2 font-sans text-[10px] uppercase tracking-[0.12em] text-muted underline-offset-4 transition-colors hover:text-danger hover:underline motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
