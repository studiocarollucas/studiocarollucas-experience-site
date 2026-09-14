import type { PublicPaixaoClutch } from "@/domain/inventory/public-clutch";

export type PaixaoClutchCatalogItem = Pick<
  PublicPaixaoClutch,
  "slug" | "name" | "rentalPrice" | "publicImagePath" | "color" | "size" | "description"
>;

export function toPaixaoClutchCatalogItem({
  slug,
  name,
  rentalPrice,
  publicImagePath,
  color,
  size,
  description,
}: PublicPaixaoClutch): PaixaoClutchCatalogItem {
  return { slug, name, rentalPrice, publicImagePath, color, size, description };
}
