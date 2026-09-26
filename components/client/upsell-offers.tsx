"use client";

import { useState, type FormEvent } from "react";
import { requestUpsellOrderAction } from "@/app/(client)/minha-experiencia/galeria/upsell-actions";
import type { UpsellProductKind } from "@/db/schema/upsell";
import { upsellProductKindLabels } from "@/domain/upsell/labels";
import { formatBRL } from "@/lib/format";
import { fromCents, toCents } from "@/lib/money";

export type ClientUpsellOfferView = {
  productId: string;
  kind: UpsellProductKind;
  name: string;
  description: string | null;
  price: string;
};

type ClientUpsellOffersProps = {
  galleryId: string;
  /** Rendered by the server for this form; repeated submits reuse it (idempotent). */
  requestKey: string;
  offers: ClientUpsellOfferView[];
  favoritesCount: number;
  suggestedExtraPhotos: number;
};

const failedMessage = "Não foi possível enviar seu pedido. Tente novamente.";

function initialQuantities(offers: ClientUpsellOfferView[], suggested: number): Record<string, number> {
  const quantities: Record<string, number> = {};
  for (const offer of offers) quantities[offer.productId] = offer.kind === "foto_adicional" ? suggested : 0;
  return quantities;
}

export function ClientUpsellOffers({
  galleryId,
  requestKey,
  offers,
  favoritesCount,
  suggestedExtraPhotos,
}: ClientUpsellOffersProps) {
  const [quantities, setQuantities] = useState(() => initialQuantities(offers, suggestedExtraPhotos));
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const chosen = offers.filter((offer) => (quantities[offer.productId] ?? 0) > 0);
  // Display only: the studio's server prices the order from its own catalog.
  const estimatedCents = chosen.reduce(
    (sum, offer) => sum + toCents(offer.price) * (quantities[offer.productId] ?? 0),
    0,
  );

  function setQuantity(productId: string, value: number) {
    const quantity = Number.isFinite(value) ? Math.min(99, Math.max(0, Math.trunc(value))) : 0;
    setQuantities((current) => ({ ...current, [productId]: quantity }));
    setSent(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || chosen.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const result = await requestUpsellOrderAction({
        galleryId,
        requestKey,
        items: chosen.map((offer) => ({ productId: offer.productId, quantity: quantities[offer.productId] })),
        notes: notes.trim() || undefined,
      });
      if (result.ok) {
        setSent(true);
        setQuantities(initialQuantities(offers, 0));
        setNotes("");
      } else {
        setError(result.error);
      }
    } catch {
      setError(failedMessage);
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="upsell-title" className="mt-12 border-t border-line pt-8">
      <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Para levar a sua história adiante</p>
      <h2 id="upsell-title" className="mt-2 font-serif text-3xl font-light">
        Produtos e extras
      </h2>
      {suggestedExtraPhotos > 0 ? (
        <p className="mt-3 font-sans text-sm leading-6 text-muted">
          Você favoritou {favoritesCount} fotos — {suggestedExtraPhotos} além das incluídas no seu pacote.
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-6">
        <ul className="flex flex-col gap-4">
          {offers.map((offer) => {
            const quantity = quantities[offer.productId] ?? 0;
            const inputId = `upsell-${offer.productId}`;
            return (
              <li key={offer.productId} className="border border-line p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-serif text-xl font-light">{offer.name}</p>
                  <p className="font-sans text-sm text-ink">{formatBRL(offer.price)}</p>
                </div>
                <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted">
                  {upsellProductKindLabels[offer.kind]}
                </p>
                {offer.description ? (
                  <p className="mt-2 font-sans text-sm leading-6 text-muted">{offer.description}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-3">
                  {offer.kind === "colecao_completa" ? (
                    <label className="flex min-h-11 items-center gap-2 font-sans text-sm">
                      <input
                        type="checkbox"
                        checked={quantity > 0}
                        onChange={(event) => setQuantity(offer.productId, event.target.checked ? 1 : 0)}
                      />
                      Quero a {offer.name}
                    </label>
                  ) : (
                    <>
                      <label htmlFor={inputId} className="font-sans text-sm">
                        Quantidade de {offer.name}
                      </label>
                      <input
                        id={inputId}
                        type="number"
                        min={0}
                        max={99}
                        inputMode="numeric"
                        value={quantity}
                        onChange={(event) => setQuantity(offer.productId, Number(event.target.value))}
                        className="w-20 border border-line bg-white px-3 py-2 font-sans text-sm"
                      />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <label className="flex flex-col gap-1.5 font-sans text-sm">
          Observações para o estúdio (opcional)
          <textarea
            value={notes}
            maxLength={1000}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="border border-line bg-white px-3 py-2 font-sans text-sm"
          />
        </label>

        <p aria-live="polite" className="font-sans text-sm text-muted">
          {chosen.length === 0
            ? "Escolha ao menos um produto."
            : `Valor estimado: ${formatBRL(fromCents(estimatedCents))}. O estúdio confirma o pedido e a forma de pagamento com você.`}
        </p>
        {error ? (
          <p role="alert" className="border-l-2 border-danger py-2 pl-4 font-sans text-sm text-danger">
            {error}
          </p>
        ) : null}
        {sent ? (
          <p role="status" className="border-l-2 border-ink py-2 pl-4 font-sans text-sm">
            Pedido enviado! O estúdio vai confirmar com você.
          </p>
        ) : null}
        <div>
          <button
            type="submit"
            disabled={pending || chosen.length === 0}
            className="border border-ink bg-ink px-7 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Solicitar pedido"}
          </button>
        </div>
      </form>
    </section>
  );
}
