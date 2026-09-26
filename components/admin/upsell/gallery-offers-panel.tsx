"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { UpsellProductKind } from "@/db/schema/upsell";
import { setGalleryUpsellOffersAction } from "@/domain/upsell/actions";
import { upsellProductKindLabels } from "@/domain/upsell/labels";
import { formatBRL } from "@/lib/format";

export type GalleryOfferProduct = {
  id: string;
  kind: UpsellProductKind;
  name: string;
  price: string;
  active: boolean;
};

/**
 * SCL-506: which catalog products this Gallery (and therefore its Shoot) offers
 * to the client. Inactive products can stay selected but never reach the portal.
 */
export function GalleryUpsellOffersPanel({
  galleryId,
  shootId,
  products,
  offeredProductIds,
}: {
  galleryId: string;
  shootId: string;
  products: GalleryOfferProduct[];
  offeredProductIds: string[];
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(offeredProductIds));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function toggle(productId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }

  function save() {
    setMessage(null);
    const productIds = products.filter((product) => selected.has(product.id)).map((product) => product.id);
    startTransition(async () => {
      const result = await setGalleryUpsellOffersAction({ galleryId, shootId, productIds });
      setMessage(result.ok ? { tone: "ok", text: "Ofertas salvas." } : { tone: "error", text: result.error });
    });
  }

  return (
    <section aria-labelledby="gallery-upsell-offers" className="mt-10 border border-line bg-white p-6">
      <h2 id="gallery-upsell-offers" className="font-serif text-2xl font-light text-ink">
        Produtos ofertados nesta galeria
      </h2>
      <p className="mt-1 font-sans text-sm text-muted">
        A cliente vê na galeria publicada apenas os produtos marcados e ativos.{" "}
        <Link href="/admin/upsells" className="underline-offset-2 hover:underline">
          Gerenciar catálogo
        </Link>
      </p>
      {products.length === 0 ? (
        <p className="mt-4 font-sans text-sm text-muted">Nenhum produto cadastrado no catálogo de upsells.</p>
      ) : (
        <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Produtos</legend>
          {products.map((product) => (
            <label key={product.id} className="flex min-h-11 items-center gap-2 font-sans text-sm">
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={(event) => toggle(product.id, event.target.checked)}
              />
              <span>
                {product.name} · {upsellProductKindLabels[product.kind]} · {formatBRL(product.price)}
                {product.active ? "" : " (inativo)"}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={pending || products.length === 0}
          className="border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar ofertas"}
        </button>
        {message ? (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={message.tone === "error" ? "font-sans text-sm text-danger" : "font-sans text-sm text-[#1e7d4f]"}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
