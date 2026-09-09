import { notFound } from "next/navigation";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { PageHeader } from "@/components/ui/page-header";
import { getGalleryForShoot } from "@/domain/gallery/service";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/session";

export default async function GalleryPage({ params }: { params: Promise<{ shootId: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) throw new Error("Acesso negado");

  const { shootId } = await params;
  const gallery = await getGalleryForShoot(shootId);
  if (!gallery) notFound();

  return (
    <div>
      <PageHeader title="Galeria do ensaio" description="Organize as fotos privadas e publique para a cliente." />
      <GalleryManager gallery={gallery} shootId={shootId} />
    </div>
  );
}
