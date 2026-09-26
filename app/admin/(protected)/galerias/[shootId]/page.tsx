import { notFound } from "next/navigation";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { GalleryUpsellOffersPanel } from "@/components/admin/upsell/gallery-offers-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getGallerySelectionSummary } from "@/domain/gallery/selections";
import { getGalleryForShoot } from "@/domain/gallery/service";
import { listGalleryUpsellOfferProductIds, listUpsellProducts } from "@/domain/upsell/catalog";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/session";

export default async function GalleryPage({ params }: { params: Promise<{ shootId: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) throw new Error("Acesso negado");

  const { shootId } = await params;
  const gallery = await getGalleryForShoot(shootId);
  if (!gallery) notFound();
  const [selectionSummary, products, offeredProductIds] = await Promise.all([
    getGallerySelectionSummary(gallery.id),
    listUpsellProducts(),
    listGalleryUpsellOfferProductIds(gallery.id),
  ]);

  return (
    <div>
      <PageHeader title="Galeria do ensaio" description="Organize as fotos privadas e publique para a cliente." />
      <GalleryManager gallery={gallery} shootId={shootId} selectionSummary={selectionSummary} />
      <GalleryUpsellOffersPanel
        galleryId={gallery.id}
        shootId={shootId}
        products={products.map((product) => ({
          id: product.id,
          kind: product.kind,
          name: product.name,
          price: product.price,
          active: product.active,
        }))}
        offeredProductIds={offeredProductIds}
      />
    </div>
  );
}
