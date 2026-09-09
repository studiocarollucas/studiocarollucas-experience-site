import { GalleryReveal } from "@/components/client/gallery-reveal";
import { readClientGalleryReveal } from "@/domain/gallery/portal";
import { getPortalRequestContext } from "@/domain/portal/server";

export default async function ClientGalleryRevealPage() {
  const context = await getPortalRequestContext();
  const reveal = await readClientGalleryReveal(context);

  return <GalleryReveal reveal={reveal} />;
}
