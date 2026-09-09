"use client";

import { useActionState } from "react";
import {
  publishGalleryAction,
  removeGalleryAssetAction,
  uploadGalleryAssetAction,
} from "@/app/admin/(protected)/galerias/[shootId]/actions";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";
import type { GalleryAsset } from "@/db/schema";
import type { ActionResult } from "@/lib/auth/action-result";

type GalleryManagerProps = {
  gallery: { id: string; status: "draft" | "published"; assets: GalleryAsset[] };
  shootId: string;
};

function useFormServerAction<T>(action: (raw: unknown) => Promise<ActionResult<T>>) {
  return useActionState(
    async (_previous: ActionResult<T> | null, formData: FormData) => action(formData),
    null as ActionResult<T> | null,
  );
}

export function GalleryManager({ gallery, shootId }: GalleryManagerProps) {
  const [uploadState, uploadAction] = useFormServerAction(uploadGalleryAssetAction);
  const [publishState, publishAction] = useFormServerAction(publishGalleryAction);

  return (
    <div className="space-y-6">
      <section className="border border-line p-5">
        <h2 className="font-serif text-xl text-ink">Adicionar fotos</h2>
        <p className="mt-1 font-sans text-sm text-muted">JPEG, PNG ou WebP de até 20 MB.</p>
        <form action={uploadAction} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="galleryId" value={gallery.id} />
          <input type="hidden" name="shootId" value={shootId} />
          <label className="font-sans text-sm text-ink">
            Arquivo
            <input className="mt-1 block text-sm" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <SubmitButton>Enviar foto</SubmitButton>
        </form>
        <div className="mt-3"><FormStatus state={uploadState} /></div>
      </section>

      <section className="border border-line p-5">
        <h2 className="font-serif text-xl text-ink">Fotos na ordem da galeria</h2>
        {gallery.assets.length ? (
          <ol className="mt-4 space-y-3">
            {gallery.assets.map((asset, index) => (
              <li key={asset.id} className="flex items-center justify-between gap-4 border-b border-line pb-3 font-sans text-sm text-ink">
                <span>{index + 1}. Foto da galeria</span>
                <RemoveAssetForm assetId={asset.id} galleryId={gallery.id} shootId={shootId} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 font-sans text-sm text-muted">Nenhuma foto enviada ainda.</p>
        )}
      </section>

      <section className="border border-line p-5">
        <h2 className="font-serif text-xl text-ink">Publicação</h2>
        <p className="mt-1 font-sans text-sm text-muted">
          {gallery.status === "published"
            ? "Esta galeria já está disponível no portal da cliente."
            : "Publicar libera esta galeria imediatamente no portal da cliente."}
        </p>
        {gallery.status === "draft" ? (
          <form action={publishAction} className="mt-4">
            <input type="hidden" name="galleryId" value={gallery.id} />
            <input type="hidden" name="shootId" value={shootId} />
            <SubmitButton>Publicar no portal agora</SubmitButton>
          </form>
        ) : null}
        <div className="mt-3"><FormStatus state={publishState} /></div>
      </section>
    </div>
  );
}

function RemoveAssetForm({ assetId, galleryId, shootId }: { assetId: string; galleryId: string; shootId: string }) {
  const [state, formAction] = useFormServerAction(removeGalleryAssetAction);
  return (
    <form action={formAction}>
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="galleryId" value={galleryId} />
      <input type="hidden" name="shootId" value={shootId} />
      <button type="submit" className="font-sans text-xs uppercase tracking-[0.12em] text-danger underline-offset-2 hover:underline">Remover</button>
      {state && !state.ok ? <span role="alert" className="ml-2 text-danger">{state.error}</span> : null}
    </form>
  );
}
