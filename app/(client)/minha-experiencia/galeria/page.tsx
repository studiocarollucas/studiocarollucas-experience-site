import { ClientGalleryGrid } from "@/components/client/gallery-grid";
import { ReviewPrompt } from "@/components/client/review-prompt";
import { ClientUpsellOffers } from "@/components/client/upsell-offers";
import { readClientGallery } from "@/domain/gallery/portal";
import { listClientSelectedAssetIds } from "@/domain/gallery/selections";
import { getPortalRequestContext } from "@/domain/portal/server";
import { getPortalReviewPrompt } from "@/domain/reviews/portal-server";
import { upsellOrderStatusLabels } from "@/domain/upsell/labels";
import {
  listClientGalleryOffers,
  listClientUpsellOrders,
  newUpsellRequestKey,
  type ClientUpsellOrder,
} from "@/domain/upsell/portal";
import { suggestExtraPhotos } from "@/domain/upsell/rules";
import { formatBRL } from "@/lib/format";

type ClientGalleryOffers = Awaited<ReturnType<typeof listClientGalleryOffers>>;

// Only the id and the view URL reach the browser — never the storage path.
function toBrowserAsset(asset: { id: string; signedUrl: string }) {
  return { id: asset.id, signedUrl: asset.signedUrl };
}

function ClientUpsellOrders({ orders }: { orders: ClientUpsellOrder[] }) {
  return (
    <section aria-labelledby="upsell-orders-title" className="mt-10">
      <h2 id="upsell-orders-title" className="font-serif text-2xl font-light">
        Seus pedidos
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {orders.map((order) => (
          <li key={order.id} className="border border-line p-4 font-sans text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                {upsellOrderStatusLabels[order.status]}
              </span>
              <span>{formatBRL(order.total)}</span>
            </div>
            <ul className="mt-2 text-muted">
              {order.items.map((item, index) => (
                <li key={`${order.id}-${index}`}>
                  {item.quantity} × {item.name}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
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
  // SCL-506/507: active offers of this Gallery and the client's own orders,
  // read server-side for the session's client only.
  let upsell: ClientGalleryOffers = { offers: [], includedPhotos: null };
  let orders: ClientUpsellOrder[] = [];
  if (gallery) {
    [upsell, orders] = await Promise.all([
      listClientGalleryOffers(context.client.id, gallery.id),
      listClientUpsellOrders(context.client.id, gallery.id),
    ]);
  }

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
          {upsell.offers.length > 0 ? (
            <ClientUpsellOffers
              galleryId={gallery.id}
              requestKey={newUpsellRequestKey()}
              offers={upsell.offers}
              favoritesCount={selectedAssetIds.length}
              suggestedExtraPhotos={suggestExtraPhotos(selectedAssetIds.length, upsell.includedPhotos)}
            />
          ) : null}
          {orders.length > 0 ? <ClientUpsellOrders orders={orders} /> : null}
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
