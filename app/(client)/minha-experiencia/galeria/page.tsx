import { ClientGalleryGrid } from "@/components/client/gallery-grid";
import { ReviewPrompt } from "@/components/client/review-prompt";
import { readClientGallery } from "@/domain/gallery/portal";
import { listClientSelectedAssetIds } from "@/domain/gallery/selections";
import { getPortalRequestContext } from "@/domain/portal/server";
import { getPortalReviewPrompt } from "@/domain/reviews/portal-server";

// Only the id and the view URL reach the browser — never the storage path.
function toBrowserAsset(asset: { id: string; signedUrl: string }) {
  return { id: asset.id, signedUrl: asset.signedUrl };
}

export default async function ClientGalleryPage() {
  const context = await getPortalRequestContext();
  const gallery = await readClientGallery(context);
  // The review card (SCL-721) only sits below a published gallery and never
  // gates it: favorites and downloads work the same with or without it.
  const [selectedAssetIds, reviewPrompt] = await Promise.all([
    gallery ? listClientSelectedAssetIds(context.client.id, gallery.id) : Promise.resolve<string[]>([]),
    gallery ? getPortalReviewPrompt() : Promise.resolve(null),
  ]);

  return (
    <section aria-labelledby="gallery-title">
      <header className="border-b border-line pb-6">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Galeria</p>
        <h1 id="gallery-title" className="mt-2 font-serif text-4xl font-light sm:text-5xl">
          Suas fotos
        </h1>
      </header>

      {gallery ? (
        <>
          <ClientGalleryGrid
            assets={gallery.assets.map(toBrowserAsset)}
            initialSelectedAssetIds={selectedAssetIds}
            downloadsEnabled={gallery.downloadsEnabled}
          />
          {reviewPrompt ? <ReviewPrompt reviewUrl={reviewPrompt.reviewUrl} /> : null}
        </>
      ) : (
        <p className="mt-8 border-l-2 border-ink py-3 pl-5 font-sans text-sm leading-6 text-muted">
          Sua galeria ficará disponível quando for publicada pelo estúdio.
        </p>
      )}
    </section>
  );
}
