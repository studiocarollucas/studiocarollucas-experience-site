import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db/client";
import {
  experiencePackages,
  inventoryItems,
  inventoryMedia,
  inventoryReservations,
  shoots,
} from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { studioDate } from "@/domain/portal/countdown";
import type { PortalContext } from "@/domain/portal/read";
import { INVENTORY_MEDIA_BUCKET } from "./media-storage";
import {
  countShootPreferences,
  eligiblePortalInventoryTypes,
  inventoryPreferenceInputSchema,
  isPortalSelectableType,
  isPortalSelectionOpen,
  PORTAL_INVENTORY_CATALOG_LIMIT,
  PORTAL_INVENTORY_PHOTO_LIMIT,
  portalItemAvailability,
  portalPreferenceLimits,
  type PortalInventoryAvailability,
  type PortalInventoryItem,
  type PortalInventoryPhoto,
  type PortalInventorySelection,
  type PortalInventoryType,
} from "./portal-selection-rules";
import {
  canonicalizeInventoryReservationLockId,
  inventoryReservationBlockingPredicate,
} from "./reservations";

/** Same TTL as the staff inventory media and the client gallery previews. */
const SIGNED_URL_TTL_SECONDS = 60 * 10;
const shootBlockingStatuses = ["pending", "confirmed"] as const;

export type PortalInventorySelectionErrorCode =
  | "invalid_input"
  | "not_open"
  | "not_eligible"
  | "unavailable"
  | "limit_reached"
  | "confirmed";

const errorMessages: Record<PortalInventorySelectionErrorCode, string> = {
  invalid_input: "Seleção inválida.",
  not_open: "A escolha de peças não está aberta para o seu ensaio.",
  not_eligible: "Esta peça não está disponível para o seu ensaio.",
  unavailable: "Esta peça está indisponível na data do seu ensaio.",
  limit_reached: "Você já atingiu o limite de peças deste tipo no seu pacote.",
  confirmed: "Esta peça já foi confirmada pelo estúdio. Fale com a equipe para alterar.",
};

export class PortalInventorySelectionError extends Error {
  constructor(public readonly code: PortalInventorySelectionErrorCode) {
    super(errorMessages[code]);
    this.name = "PortalInventorySelectionError";
  }
}

/** Resolved on the server from the portal session, never from the request. */
export type PortalPreferenceActor = {
  clientId: string;
  shootId: string;
  authUserId: string;
};

type Reader = Pick<typeof db, "select">;

async function readClientShoot(reader: Reader, clientId: string, shootId: string) {
  const [shoot] = await reader
    .select({
      id: shoots.id,
      shootDate: shoots.shootDate,
      status: shoots.status,
      portalEnabled: shoots.portalEnabled,
      outfitsLimit: experiencePackages.outfitsLimit,
      clutchIncluded: experiencePackages.clutchIncluded,
    })
    .from(shoots)
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(and(eq(shoots.id, shootId), eq(shoots.clientId, clientId)))
    .limit(1);
  return shoot ?? null;
}

// The bucket is staff-only under RLS, so signing for a client needs the service
// role — created per call, server-side only, exactly like readClientGallery.
function inventoryMediaStorageAdmin() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return supabase.storage.from(INVENTORY_MEDIA_BUCKET);
}

async function readSignedPhotos(itemIds: string[]): Promise<Map<string, PortalInventoryPhoto[]>> {
  const photosByItem = new Map<string, PortalInventoryPhoto[]>();
  if (itemIds.length === 0) return photosByItem;

  const rows = await db
    .select({
      id: inventoryMedia.id,
      inventoryItemId: inventoryMedia.inventoryItemId,
      storagePath: inventoryMedia.storagePath,
    })
    .from(inventoryMedia)
    .where(and(inArray(inventoryMedia.inventoryItemId, itemIds), isNull(inventoryMedia.deletionRequestedAt)))
    .orderBy(
      desc(inventoryMedia.isCover),
      asc(inventoryMedia.sortOrder),
      asc(inventoryMedia.createdAt),
      asc(inventoryMedia.id),
    );

  const perItem = new Map<string, number>();
  const selected = rows.filter((row) => {
    const taken = perItem.get(row.inventoryItemId) ?? 0;
    if (taken >= PORTAL_INVENTORY_PHOTO_LIMIT) return false;
    perItem.set(row.inventoryItemId, taken + 1);
    return true;
  });
  if (selected.length === 0) return photosByItem;

  const paths = selected.map((row) => row.storagePath);
  const signed = await inventoryMediaStorageAdmin().createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data || signed.data.length !== paths.length) {
    throw new Error("portal inventory media URLs unavailable", { cause: signed.error });
  }

  const urlsByPath = new Map<string, string>();
  for (const item of signed.data) {
    if (item.error || !item.path || !item.signedUrl || urlsByPath.has(item.path)) {
      throw new Error("portal inventory media URLs unavailable", { cause: item.error });
    }
    urlsByPath.set(item.path, item.signedUrl);
  }

  for (const row of selected) {
    const signedUrl = urlsByPath.get(row.storagePath);
    if (!signedUrl) throw new Error("portal inventory media URLs unavailable");
    // Only the media id and the short-lived URL leave the server.
    const list = photosByItem.get(row.inventoryItemId) ?? [];
    list.push({ id: row.id, signedUrl });
    photosByItem.set(row.inventoryItemId, list);
  }
  return photosByItem;
}

type ItemFields = {
  id: string;
  name: string;
  type: PortalInventoryType;
  color: string | null;
  size: string | null;
};

function toPortalItem(
  item: ItemFields,
  availability: PortalInventoryAvailability,
  photos: Map<string, PortalInventoryPhoto[]>,
): PortalInventoryItem {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    color: item.color,
    size: item.size,
    photos: photos.get(item.id) ?? [],
    availability,
  };
}

/**
 * Client-safe inventory read model for the portal Styling page. Ownership of the
 * shoot is re-checked against the database with the server-side client id, and
 * only display fields (never code, internal description, prices or storage
 * paths) are projected. Availability of other items is a boolean: the client
 * never learns whose reservation blocks an item or its period.
 */
export async function readPortalInventorySelection(
  context: PortalContext,
  now = new Date(),
): Promise<PortalInventorySelection | null> {
  if (!context.shoot) return null;
  const shoot = await readClientShoot(db, context.client.id, context.shoot.id);
  if (!shoot) return null;

  const selectionOpen = isPortalSelectionOpen(shoot, studioDate(now));
  const limits = portalPreferenceLimits(shoot);

  const ownRows = await db
    .select({
      inventoryItemId: inventoryReservations.inventoryItemId,
      status: inventoryReservations.status,
      name: inventoryItems.name,
      type: inventoryItems.type,
      color: inventoryItems.color,
      size: inventoryItems.size,
    })
    .from(inventoryReservations)
    .innerJoin(inventoryItems, eq(inventoryReservations.inventoryItemId, inventoryItems.id))
    .where(
      and(
        eq(inventoryReservations.shootId, shoot.id),
        inArray(inventoryReservations.status, shootBlockingStatuses),
      ),
    )
    .orderBy(asc(inventoryReservations.createdAt), asc(inventoryReservations.id));

  // One entry per item; a studio confirmation wins over a pending preference.
  const ownByItem = new Map<string, ItemFields & { status: "pending" | "confirmed" }>();
  for (const row of ownRows) {
    const status = row.status === "confirmed" ? "confirmed" : "pending";
    const current = ownByItem.get(row.inventoryItemId);
    if (current?.status === "confirmed") continue;
    ownByItem.set(row.inventoryItemId, {
      id: row.inventoryItemId,
      name: row.name,
      type: row.type,
      color: row.color,
      size: row.size,
      status,
    });
  }

  const eligibleTypes = selectionOpen ? eligiblePortalInventoryTypes(limits) : [];
  const catalogRows: ItemFields[] = eligibleTypes.length
    ? await db
        .select({
          id: inventoryItems.id,
          name: inventoryItems.name,
          type: inventoryItems.type,
          color: inventoryItems.color,
          size: inventoryItems.size,
        })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.active, true),
            eq(inventoryItems.status, "available"),
            inArray(inventoryItems.type, eligibleTypes),
          ),
        )
        .orderBy(asc(inventoryItems.type), asc(inventoryItems.name), asc(inventoryItems.id))
        .limit(PORTAL_INVENTORY_CATALOG_LIMIT)
    : [];
  const catalogItems = catalogRows.filter((item) => !ownByItem.has(item.id));

  const catalogIds = catalogItems.map((item) => item.id);
  const blockedRows = catalogIds.length
    ? await db
        .select({ inventoryItemId: inventoryReservations.inventoryItemId })
        .from(inventoryReservations)
        .where(
          and(
            inArray(inventoryReservations.inventoryItemId, catalogIds),
            inventoryReservationBlockingPredicate(now),
            lte(inventoryReservations.startsOn, shoot.shootDate),
            gte(inventoryReservations.endsOn, shoot.shootDate),
            or(isNull(inventoryReservations.shootId), ne(inventoryReservations.shootId, shoot.id)),
          ),
        )
    : [];
  const blocked = new Set(blockedRows.map((row) => row.inventoryItemId));

  const ownItems = [...ownByItem.values()];
  const photos = await readSignedPhotos([...ownItems.map((item) => item.id), ...catalogIds]);

  return {
    selectionOpen,
    limits,
    used: countShootPreferences(ownItems),
    shootItems: ownItems.map((item) =>
      toPortalItem(item, portalItemAvailability(item.status, false), photos),
    ),
    catalog: catalogItems.map((item) =>
      toPortalItem(item, portalItemAvailability(null, blocked.has(item.id)), photos),
    ),
  };
}

/**
 * Sets (not toggles) the client's preference for one inventory item on her own
 * shoot. `actor` must come from the server-side portal context. Preferring
 * creates a 'pending' shoot reservation under the same advisory lock and
 * conflict rules staff reservations use; withdrawing cancels only the client's
 * pending preference — a studio confirmation is never changed from the portal.
 */
export async function setClientInventoryPreference(
  actor: PortalPreferenceActor,
  input: unknown,
): Promise<{ inventoryItemId: string; state: PortalInventoryAvailability }> {
  const parsed = inventoryPreferenceInputSchema.safeParse(input);
  if (!parsed.success) throw new PortalInventorySelectionError("invalid_input");
  const { inventoryItemId, preferred } = parsed.data;

  return db.transaction(async (tx) => {
    // Same item lock as createShootInventoryReservation and public rentals.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${canonicalizeInventoryReservationLockId(inventoryItemId)}))`,
    );
    // Serialize this shoot's preferences so the per-type limit cannot be raced.
    const [locked] = await tx
      .select({ id: shoots.id })
      .from(shoots)
      .where(and(eq(shoots.id, actor.shootId), eq(shoots.clientId, actor.clientId)))
      .limit(1)
      .for("update");
    const shoot = locked ? await readClientShoot(tx, actor.clientId, actor.shootId) : null;
    const now = new Date();
    if (!shoot || !isPortalSelectionOpen(shoot, studioDate(now))) {
      throw new PortalInventorySelectionError("not_open");
    }

    const own = await tx
      .select({ id: inventoryReservations.id, status: inventoryReservations.status })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.inventoryItemId, inventoryItemId),
          eq(inventoryReservations.shootId, shoot.id),
          inArray(inventoryReservations.status, shootBlockingStatuses),
        ),
      );
    const hasConfirmed = own.some((row) => row.status === "confirmed");

    if (!preferred) {
      if (hasConfirmed) throw new PortalInventorySelectionError("confirmed");
      const pendingIds = own.filter((row) => row.status === "pending").map((row) => row.id);
      if (pendingIds.length === 0) return { inventoryItemId, state: "available" as const };

      const cancelledAt = new Date();
      const cancelled = await tx
        .update(inventoryReservations)
        .set({
          status: "cancelled",
          cancelledAt,
          cancelledByUserId: actor.authUserId,
          updatedAt: cancelledAt,
        })
        .where(
          and(
            inArray(inventoryReservations.id, pendingIds),
            eq(inventoryReservations.shootId, shoot.id),
            eq(inventoryReservations.status, "pending"),
          ),
        )
        .returning({ id: inventoryReservations.id });
      for (const row of cancelled) {
        await recordAuditEvent(
          {
            actorUserId: actor.authUserId,
            action: "inventory_reservation.preference_withdrawn",
            entityType: "inventory_reservation",
            entityId: row.id,
            before: { status: "pending" },
            after: { status: "cancelled", cancelledAt, cancelledByUserId: actor.authUserId },
          },
          tx,
        );
      }
      return { inventoryItemId, state: "available" as const };
    }

    // Repeating the same request converges on the current state.
    if (own.length > 0) {
      return { inventoryItemId, state: hasConfirmed ? ("reserved" as const) : ("preferred" as const) };
    }

    const limits = portalPreferenceLimits(shoot);
    const [item] = await tx
      .select({ type: inventoryItems.type, active: inventoryItems.active, status: inventoryItems.status })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, inventoryItemId))
      .limit(1)
      .for("update");
    if (!item || !item.active || item.status !== "available") {
      throw new PortalInventorySelectionError("not_eligible");
    }
    const itemType = item.type;
    if (!isPortalSelectableType(limits, itemType)) {
      throw new PortalInventorySelectionError("not_eligible");
    }

    const linked = await tx
      .select({
        inventoryItemId: inventoryReservations.inventoryItemId,
        type: inventoryItems.type,
        status: inventoryReservations.status,
      })
      .from(inventoryReservations)
      .innerJoin(inventoryItems, eq(inventoryReservations.inventoryItemId, inventoryItems.id))
      .where(
        and(
          eq(inventoryReservations.shootId, shoot.id),
          inArray(inventoryReservations.status, shootBlockingStatuses),
        ),
      );
    // Count distinct items so a studio split reservation is not counted twice.
    const linkedItems = [...new Map(linked.map((row) => [row.inventoryItemId, row])).values()];
    if (countShootPreferences(linkedItems)[itemType] >= limits[itemType]) {
      throw new PortalInventorySelectionError("limit_reached");
    }

    const [conflict] = await tx
      .select({ id: inventoryReservations.id })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.inventoryItemId, inventoryItemId),
          inventoryReservationBlockingPredicate(now),
          lte(inventoryReservations.startsOn, shoot.shootDate),
          gte(inventoryReservations.endsOn, shoot.shootDate),
        ),
      )
      .limit(1);
    if (conflict) throw new PortalInventorySelectionError("unavailable");

    const [reservation] = await tx
      .insert(inventoryReservations)
      .values({
        inventoryItemId,
        shootId: shoot.id,
        purpose: "shoot",
        startsOn: shoot.shootDate,
        endsOn: shoot.shootDate,
        status: "pending",
      })
      .returning();
    if (!reservation) throw new Error("falha ao registrar preferência");

    await recordAuditEvent(
      {
        actorUserId: actor.authUserId,
        action: "inventory_reservation.preference_created",
        entityType: "inventory_reservation",
        entityId: reservation.id,
        after: {
          inventoryItemId: reservation.inventoryItemId,
          shootId: reservation.shootId,
          purpose: reservation.purpose,
          startsOn: reservation.startsOn,
          endsOn: reservation.endsOn,
          status: reservation.status,
        },
      },
      tx,
    );

    return { inventoryItemId, state: "preferred" as const };
  });
}
