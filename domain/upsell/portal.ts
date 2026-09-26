import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  experiencePackages,
  galleries,
  galleryUpsellOffers,
  shoots,
  upsellOrderItems,
  upsellOrders,
  upsellProducts,
  type UpsellOrderStatus,
  type UpsellProductKind,
} from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { UpsellError, upsellErrorFromDatabase } from "./errors";
import { quoteUpsellOrder, type OfferedUpsellProduct } from "./rules";
import { upsellOrderRequestSchema } from "./schema";

// SCL-506/507, client side. Like the gallery portal (domain/gallery/portal.ts),
// everything runs server-side with `clientId` taken from the portal session;
// the upsell tables are staff-only through the Data API.

/** Client-safe offer: never internal notes, flags or other galleries' data. */
export type ClientUpsellOffer = OfferedUpsellProduct;

export type ClientUpsellOrder = {
  id: string;
  status: UpsellOrderStatus;
  total: string;
  createdAt: string;
  items: { name: string; kind: UpsellProductKind; quantity: number; lineTotal: string }[];
};

type Reader = Pick<typeof db, "select">;

/** Idempotency key for one portal order form (a fresh one per rendered form). */
export function newUpsellRequestKey(): string {
  return randomUUID();
}

/** The Gallery must be published and belong to a Shoot of this client. */
async function findClientPublishedGallery(reader: Reader, clientId: string, galleryId: string) {
  const [gallery] = await reader
    .select({
      galleryId: galleries.id,
      shootId: galleries.shootId,
      includedPhotos: experiencePackages.includedPhotos,
    })
    .from(galleries)
    .innerJoin(shoots, eq(galleries.shootId, shoots.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(and(eq(galleries.id, galleryId), eq(shoots.clientId, clientId), eq(galleries.status, "published")))
    .limit(1);
  return gallery ?? null;
}

/** Active products offered by the Gallery, with only the client-safe fields. */
async function readGalleryOffers(reader: Reader, galleryId: string): Promise<ClientUpsellOffer[]> {
  return reader
    .select({
      productId: upsellProducts.id,
      kind: upsellProducts.kind,
      name: upsellProducts.name,
      description: upsellProducts.description,
      price: upsellProducts.price,
    })
    .from(galleryUpsellOffers)
    .innerJoin(upsellProducts, eq(galleryUpsellOffers.productId, upsellProducts.id))
    .where(and(eq(galleryUpsellOffers.galleryId, galleryId), eq(upsellProducts.active, true)))
    .orderBy(asc(upsellProducts.sortOrder), asc(upsellProducts.name));
}

export async function listClientGalleryOffers(
  clientId: string,
  galleryId: string,
): Promise<{ offers: ClientUpsellOffer[]; includedPhotos: number | null }> {
  const gallery = await findClientPublishedGallery(db, clientId, galleryId);
  if (!gallery) return { offers: [], includedPhotos: null };
  return { offers: await readGalleryOffers(db, gallery.galleryId), includedPhotos: gallery.includedPhotos };
}

export async function listClientUpsellOrders(clientId: string, galleryId: string): Promise<ClientUpsellOrder[]> {
  const orders = await db
    .select({
      id: upsellOrders.id,
      status: upsellOrders.status,
      total: upsellOrders.total,
      createdAt: upsellOrders.createdAt,
    })
    .from(upsellOrders)
    .where(and(eq(upsellOrders.clientId, clientId), eq(upsellOrders.galleryId, galleryId)))
    .orderBy(desc(upsellOrders.createdAt));
  if (orders.length === 0) return [];

  const items = await db
    .select({
      orderId: upsellOrderItems.orderId,
      name: upsellOrderItems.name,
      kind: upsellOrderItems.kind,
      quantity: upsellOrderItems.quantity,
      lineTotal: upsellOrderItems.lineTotal,
    })
    .from(upsellOrderItems)
    .where(
      inArray(
        upsellOrderItems.orderId,
        orders.map((order) => order.id),
      ),
    )
    .orderBy(asc(upsellOrderItems.createdAt));

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({ name: item.name, kind: item.kind, quantity: item.quantity, lineTotal: item.lineTotal })),
  }));
}

export type RequestedUpsellOrder = { id: string; status: UpsellOrderStatus; total: string };

/**
 * The client asks for products from her Gallery (PRD §6.5). The order is born
 * `solicitado` for the studio to confirm. `clientId`/`actorUserId` come from the
 * portal session; the payload only chooses products and quantities — prices are
 * read and computed here. Idempotent per (client, requestKey): a repeated or
 * concurrent submit returns the same order without a second audit entry.
 */
export async function requestUpsellOrder(
  clientId: string,
  actorUserId: string | null,
  input: unknown,
): Promise<{ order: RequestedUpsellOrder; created: boolean }> {
  const parsed = upsellOrderRequestSchema.safeParse(input);
  if (!parsed.success) throw new UpsellError("Revise os produtos e as quantidades do pedido.");
  const { galleryId, requestKey, items, notes } = parsed.data;

  const orderColumns = { id: upsellOrders.id, status: upsellOrders.status, total: upsellOrders.total };
  const sameRequest = and(eq(upsellOrders.clientId, clientId), eq(upsellOrders.requestKey, requestKey));

  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select(orderColumns).from(upsellOrders).where(sameRequest).limit(1);
      if (existing) return { order: existing, created: false };

      const gallery = await findClientPublishedGallery(tx, clientId, galleryId);
      if (!gallery) throw new UpsellError("Esta galeria não está disponível para pedidos.");

      const quote = quoteUpsellOrder(await readGalleryOffers(tx, gallery.galleryId), items);

      const [order] = await tx
        .insert(upsellOrders)
        .values({
          clientId,
          shootId: gallery.shootId,
          galleryId: gallery.galleryId,
          status: "solicitado",
          total: quote.total,
          clientNotes: notes || null,
          requestKey,
        })
        .onConflictDoNothing({ target: [upsellOrders.clientId, upsellOrders.requestKey] })
        .returning(orderColumns);

      if (!order) {
        // A concurrent submit with the same key committed first.
        const [raced] = await tx.select(orderColumns).from(upsellOrders).where(sameRequest).limit(1);
        if (!raced) throw new Error("Pedido de upsell em conflito.");
        return { order: raced, created: false };
      }

      await tx.insert(upsellOrderItems).values(
        quote.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          kind: item.kind,
          name: item.name,
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
      );

      await recordAuditEvent(
        {
          actorUserId,
          action: "upsell_order.requested",
          entityType: "upsell_order",
          entityId: order.id,
          before: null,
          after: {
            clientId,
            shootId: gallery.shootId,
            galleryId: gallery.galleryId,
            status: order.status,
            total: order.total,
            items: quote.items,
          },
        },
        tx,
      );
      return { order, created: true };
    });
  } catch (error) {
    throw upsellErrorFromDatabase(error) ?? error;
  }
}
