import "server-only";

import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryItems, inventoryPublicMedia } from "@/db/schema";

export type PublicPaixaoClutch = {
  id: string;
  slug: string;
  name: string;
  copy: string;
  rentalPrice: string;
  publicImagePath: string;
  featured: boolean;
  sortOrder: number;
};

const publicPaixaoClutchFields = {
  id: inventoryItems.id,
  slug: inventoryItems.paixaoClutchSlug,
  name: inventoryItems.name,
  copy: inventoryItems.paixaoClutchCopy,
  rentalPrice: inventoryItems.rentalPrice,
  publicImagePath: inventoryItems.paixaoClutchPublicImagePath,
  featured: inventoryItems.paixaoClutchFeatured,
  sortOrder: inventoryItems.paixaoClutchSortOrder,
};

function publicPaixaoClutchPredicate() {
  return and(
    eq(inventoryItems.type, "clutch"),
    eq(inventoryItems.active, true),
    eq(inventoryItems.status, "available"),
    eq(inventoryItems.paixaoClutchEligible, true),
    eq(inventoryItems.paixaoClutchPublished, true),
    isNotNull(inventoryItems.paixaoClutchSlug),
    isNotNull(inventoryItems.rentalPrice),
    isNotNull(inventoryItems.paixaoClutchCopy),
    isNotNull(inventoryItems.paixaoClutchPublicImagePath),
    eq(inventoryPublicMedia.state, "ready"),
    eq(inventoryPublicMedia.publicPath, inventoryItems.paixaoClutchPublicImagePath),
  );
}

type PublicPaixaoClutchRow = Omit<PublicPaixaoClutch, "slug" | "copy" | "rentalPrice" | "publicImagePath"> & {
  slug: string | null;
  copy: string | null;
  rentalPrice: string | null;
  publicImagePath: string | null;
};

function asPublicPaixaoClutch(row: PublicPaixaoClutchRow): PublicPaixaoClutch {
  const { slug, copy, rentalPrice, publicImagePath } = row;
  if (slug === null || copy === null || rentalPrice === null || publicImagePath === null) {
    throw new Error("A public clutch projection requires complete curated data.");
  }
  return { ...row, slug, copy, rentalPrice, publicImagePath };
}

export async function listPublicPaixaoClutches(): Promise<PublicPaixaoClutch[]> {
  const rows = await db
    .select(publicPaixaoClutchFields)
    .from(inventoryItems)
    .innerJoin(inventoryPublicMedia, eq(inventoryPublicMedia.inventoryItemId, inventoryItems.id))
    .where(publicPaixaoClutchPredicate())
    .orderBy(
      desc(inventoryItems.paixaoClutchFeatured),
      asc(inventoryItems.paixaoClutchSortOrder),
      asc(inventoryItems.name),
    );

  return rows.map(asPublicPaixaoClutch);
}

export async function findPublicPaixaoClutch(slug: string): Promise<PublicPaixaoClutch | null> {
  const [row] = await db
    .select(publicPaixaoClutchFields)
    .from(inventoryItems)
    .innerJoin(inventoryPublicMedia, eq(inventoryPublicMedia.inventoryItemId, inventoryItems.id))
    .where(and(publicPaixaoClutchPredicate(), eq(inventoryItems.paixaoClutchSlug, slug)))
    .limit(1);

  return row ? asPublicPaixaoClutch(row) : null;
}
