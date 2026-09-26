"use client";

import { useState } from "react";
import { setPhotoSelectionAction } from "@/app/(client)/minha-experiencia/galeria/actions";

export type ClientGalleryGridAsset = {
  id: string;
  signedUrl: string;
};

type ClientGalleryGridProps = {
  assets: ClientGalleryGridAsset[];
  initialSelectedAssetIds: string[];
  downloadsEnabled: boolean;
};

const selectionFailedMessage = "Não foi possível salvar seu favorito. Tente novamente.";

function withMember(set: ReadonlySet<string>, id: string, member: boolean): ReadonlySet<string> {
  const next = new Set(set);
  if (member) next.add(id);
  else next.delete(id);
  return next;
}

function selectionSummary(count: number): string {
  if (count === 0) return "Toque em Favoritar para marcar as fotos que você mais amou.";
  if (count === 1) return "1 foto favorita";
  return `${count} fotos favoritas`;
}

function galleryDownloadHref(assetId: string): string {
  return `/minha-experiencia/galeria/fotos/${encodeURIComponent(assetId)}/download`;
}

export function ClientGalleryGrid({ assets, initialSelectedAssetIds, downloadsEnabled }: ClientGalleryGridProps) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set(initialSelectedAssetIds));
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const selectedCount = assets.filter((asset) => selectedIds.has(asset.id)).length;

  // Optimistic, but the server is authoritative: the final state comes from the
  // action result, and any failure reverts the photo to its previous state.
  async function changeSelection(assetId: string, selected: boolean) {
    if (pendingIds.has(assetId)) return;
    setError(null);
    setSelectedIds((current) => withMember(current, assetId, selected));
    setPendingIds((current) => withMember(current, assetId, true));
    try {
      const result = await setPhotoSelectionAction({ assetId, selected });
      if (result.ok) {
        setSelectedIds((current) => withMember(current, assetId, result.data.selected));
      } else {
        setSelectedIds((current) => withMember(current, assetId, !selected));
        setError(result.error);
      }
    } catch {
      setSelectedIds((current) => withMember(current, assetId, !selected));
      setError(selectionFailedMessage);
    } finally {
      setPendingIds((current) => withMember(current, assetId, false));
    }
  }

  return (
    <div className="mt-8">
      <p aria-live="polite" className="font-sans text-sm text-muted">
        {selectionSummary(selectedCount)}
      </p>
      {error ? (
        <p role="alert" className="mt-3 border-l-2 border-danger py-2 pl-4 font-sans text-sm text-danger">
          {error}
        </p>
      ) : null}
      {downloadsEnabled ? null : (
        <p className="mt-3 font-sans text-xs leading-5 text-muted">
          O download das fotos ainda não foi liberado pelo estúdio.
        </p>
      )}

      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset, index) => {
          const position = index + 1;
          const isSelected = selectedIds.has(asset.id);
          const isPending = pendingIds.has(asset.id);

          return (
            <li key={asset.id}>
              <img
                src={asset.signedUrl}
                alt={`Foto ${position} da sua galeria`}
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Favoritar foto ${position}`}
                  aria-busy={isPending || undefined}
                  onClick={() => void changeSelection(asset.id, !isSelected)}
                  className="inline-flex min-h-11 items-center gap-2 font-sans text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-cream aria-busy:opacity-60"
                >
                  <span aria-hidden="true" className={isSelected ? "text-danger" : "text-muted"}>
                    {isSelected ? "♥" : "♡"}
                  </span>
                  <span>{isSelected ? "Favorita" : "Favoritar"}</span>
                </button>
                {downloadsEnabled ? (
                  <a
                    href={galleryDownloadHref(asset.id)}
                    aria-label={`Baixar foto ${position}`}
                    className="inline-flex min-h-11 items-center font-sans text-xs uppercase tracking-[0.12em] text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                  >
                    Baixar
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
