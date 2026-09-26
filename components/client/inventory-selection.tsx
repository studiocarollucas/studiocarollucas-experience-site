"use client";

import { useState } from "react";
import { setInventoryPreferenceAction } from "@/app/(client)/minha-experiencia/styling/actions";
import type {
  PortalInventoryItem,
  PortalInventorySelection,
  PortalSelectableType,
} from "@/domain/inventory/portal-selection-rules";

const typeLabels: Record<PortalInventoryItem["type"], string> = {
  outfit: "Figurino",
  clutch: "Clutch",
  accessory: "Acessório",
  prop: "Objeto de cena",
};

const groupLabels: Record<PortalSelectableType, string> = {
  outfit: "Figurinos",
  clutch: "Clutches",
};

const failedMessage = "Não foi possível salvar sua escolha. Tente novamente.";

function itemDetails(item: PortalInventoryItem): string {
  return [
    typeLabels[item.type],
    item.color ? `Cor: ${item.color}` : null,
    item.size ? `Tamanho: ${item.size}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function limitSummary(selection: PortalInventorySelection): string {
  const parts: string[] = [];
  if (selection.limits.outfit > 0) {
    parts.push(`Figurinos: ${selection.used.outfit} de ${selection.limits.outfit}`);
  }
  if (selection.limits.clutch > 0) {
    parts.push(`Clutch: ${selection.used.clutch} de ${selection.limits.clutch}`);
  }
  return parts.join(" · ");
}

function ItemPhotos({ item }: { item: PortalInventoryItem }) {
  const [cover, ...others] = item.photos;
  if (!cover) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-rose3 px-4 text-center font-sans text-xs text-muted">
        Foto em breve
      </div>
    );
  }
  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden bg-rose3">
        {/* Signed private Supabase URLs are short-lived and their host is intentionally not in next/image config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover.signedUrl}
          alt={`${item.name} — foto 1`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      {others.length > 0 ? (
        <ul className="mt-2 grid list-none grid-cols-3 gap-2">
          {others.map((photo, index) => (
            <li key={photo.id} className="aspect-square overflow-hidden bg-rose3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.signedUrl}
                alt={`${item.name} — foto ${index + 2}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const buttonClass =
  "inline-flex min-h-11 items-center font-sans text-xs uppercase tracking-[0.12em] text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-60";

export function ClientInventorySelection({ selection }: { selection: PortalInventorySelection }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The server is authoritative: the action re-checks eligibility, limit and
  // conflicts, and revalidates the page so the props carry the new state.
  async function changePreference(item: PortalInventoryItem, preferred: boolean) {
    if (pendingId) return;
    setError(null);
    setPendingId(item.id);
    try {
      const result = await setInventoryPreferenceAction({ inventoryItemId: item.id, preferred });
      if (!result.ok) setError(result.error);
    } catch {
      setError(failedMessage);
    } finally {
      setPendingId(null);
    }
  }

  const summary = limitSummary(selection);
  const groups = (["outfit", "clutch"] as const)
    .filter((type) => selection.limits[type] > 0)
    .map((type) => ({ type, items: selection.catalog.filter((item) => item.type === type) }));

  return (
    <section aria-labelledby="inventory-title" className="flex flex-col gap-6">
      <header className="border-b border-line pb-4">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Acervo do estúdio</p>
        <h2 id="inventory-title" className="mt-2 font-serif text-3xl font-light">
          Peças do acervo
        </h2>
        <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-muted">
          Figurinos e clutches reais do estúdio. Marque suas preferências: a equipe confirma a reserva
          para a data do seu ensaio.
        </p>
        {selection.selectionOpen && summary ? (
          <p className="mt-2 font-sans text-xs uppercase tracking-[0.12em] text-muted">{summary}</p>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="border-l-2 border-danger py-2 pl-4 font-sans text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div>
        <h3 className="font-serif text-2xl font-light">Peças do seu ensaio</h3>
        {selection.shootItems.length === 0 ? (
          <p className="mt-2 font-sans text-sm text-muted">Nenhuma peça escolhida ainda.</p>
        ) : (
          <ul className="mt-4 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {selection.shootItems.map((item) => (
              <li key={item.id} className="min-w-0 border-t border-line pt-3">
                <ItemPhotos item={item} />
                <p className="mt-3 font-sans text-sm text-ink">{item.name}</p>
                <p className="font-sans text-xs text-muted">{itemDetails(item)}</p>
                <p className="mt-2 font-sans text-xs uppercase tracking-[0.12em] text-ink">
                  {item.availability === "reserved"
                    ? "Reservada para o seu ensaio"
                    : "Sua preferência · aguardando confirmação do estúdio"}
                </p>
                {item.availability === "preferred" && selection.selectionOpen ? (
                  <button
                    type="button"
                    className={buttonClass}
                    aria-label={`Remover preferência: ${item.name}`}
                    aria-busy={pendingId === item.id || undefined}
                    disabled={pendingId !== null}
                    onClick={() => void changePreference(item, false)}
                  >
                    Remover preferência
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selection.selectionOpen && groups.length === 0 ? (
        <p className="border-l-2 border-ink py-3 pl-5 font-sans text-sm leading-6 text-muted">
          Seu pacote não inclui escolha de figurinos ou clutches do acervo. Fale com o estúdio se quiser
          incluir.
        </p>
      ) : selection.selectionOpen ? (
        groups.map((group) => {
          const limitReached = selection.used[group.type] >= selection.limits[group.type];
          return (
            <div key={group.type}>
              <h3 className="font-serif text-2xl font-light">{groupLabels[group.type]}</h3>
              {limitReached ? (
                <p className="mt-2 font-sans text-sm text-muted">
                  Você atingiu o limite do seu pacote. Remova uma preferência para escolher outra peça.
                </p>
              ) : null}
              {group.items.length === 0 ? (
                <p className="mt-2 font-sans text-sm text-muted">Nenhuma peça disponível para escolha agora.</p>
              ) : (
                <ul className="mt-4 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <li key={item.id} className="min-w-0 border-t border-line pt-3">
                      <ItemPhotos item={item} />
                      <p className="mt-3 font-sans text-sm text-ink">{item.name}</p>
                      <p className="font-sans text-xs text-muted">{itemDetails(item)}</p>
                      {item.availability === "unavailable" ? (
                        <p className="mt-2 font-sans text-xs uppercase tracking-[0.12em] text-muted">
                          Indisponível na data do seu ensaio
                        </p>
                      ) : (
                        <button
                          type="button"
                          className={buttonClass}
                          aria-label={`Marcar como preferência: ${item.name}`}
                          aria-busy={pendingId === item.id || undefined}
                          disabled={pendingId !== null || limitReached}
                          onClick={() => void changePreference(item, true)}
                        >
                          Marcar como preferência
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      ) : (
        <p className="border-l-2 border-ink py-3 pl-5 font-sans text-sm leading-6 text-muted">
          A escolha de peças está encerrada para este ensaio. Fale com o estúdio para qualquer ajuste.
        </p>
      )}
    </section>
  );
}
