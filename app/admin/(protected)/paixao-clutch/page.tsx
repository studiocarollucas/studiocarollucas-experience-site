import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  PaixaoClutchCatalog,
  type PaixaoClutchCatalogItem,
} from "@/components/admin/paixao-clutch-catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { listPaixaoClutchForAdmin, type PaixaoClutchAdminFilters } from "@/domain/inventory/clutch";

function parseBoolean(value: string | string[] | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function toCatalogItem(
  item: Awaited<ReturnType<typeof listPaixaoClutchForAdmin>>[number]
): PaixaoClutchCatalogItem {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    active: item.active,
    status: item.status,
    rentalPrice: item.rentalPrice,
    replacementValue: item.replacementValue,
    copy: item.paixaoClutchCopy,
    publicImagePath: item.paixaoClutchPublicImagePath,
    published: item.paixaoClutchPublished,
    featured: item.paixaoClutchFeatured,
    sortOrder: item.paixaoClutchSortOrder,
  };
}

export default async function PaixaoClutchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) redirect("/admin/login");

  const raw = await searchParams;
  const filters: PaixaoClutchAdminFilters = {};
  const active = parseBoolean(raw.active);
  const published = parseBoolean(raw.published);
  const featured = parseBoolean(raw.featured);
  if (active !== undefined) filters.active = active;
  if (published !== undefined) filters.published = published;
  if (featured !== undefined) filters.featured = featured;

  const items = await listPaixaoClutchForAdmin(filters, user.id);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Paixão Clutch"
        description="Curadoria administrativa, preços e publicação editorial das clutches."
      />
      <PaixaoClutchCatalog items={items.map(toCatalogItem)} filters={filters} />
    </div>
  );
}
