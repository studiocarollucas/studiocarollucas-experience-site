import "server-only";

import { eq } from "drizzle-orm";
import { clients, shoots, type Gallery } from "@/db/schema";
import { enqueueAutomationEvent, type AutomationWriter } from "../events";
import { absoluteSiteUrl, portalPaths } from "../links";
import { firstNameOf, normalizeRecipient } from "../recipients";
import {
  GALLERY_PUBLISHED_EVENT_TYPE,
  GALLERY_PUBLISHED_TEMPLATE_KEY,
  galleryPublishedIdempotencyKey,
} from "./rules";

export type GalleryPublishedResult =
  | { status: "enqueued" | "replayed"; eventId: string }
  | { status: "skipped"; reason: "not_published" | "no_photos" | "no_client" | "no_email" };

/**
 * SCL-703: the communication of a publication, as its own outbox event written
 * in the publish transaction. Keyed per gallery, so publishing the same gallery
 * again never emails twice. The link is the portal Reveal page (login
 * required) — never a token or a signed asset URL.
 */
export async function enqueueGalleryPublished(
  input: { gallery: Pick<Gallery, "id" | "shootId" | "status">; photoCount: number },
  writer: AutomationWriter,
  now: Date = new Date(),
): Promise<GalleryPublishedResult> {
  const { gallery } = input;
  // Drafts never communicate anything.
  if (gallery.status !== "published") return { status: "skipped", reason: "not_published" };
  // An empty Reveal would greet the client with nothing to see.
  if (input.photoCount === 0) return { status: "skipped", reason: "no_photos" };

  const [client] = await writer
    .select({ name: clients.name, email: clients.email })
    .from(shoots)
    .innerJoin(clients, eq(clients.id, shoots.clientId))
    .where(eq(shoots.id, gallery.shootId))
    .limit(1);
  if (!client) return { status: "skipped", reason: "no_client" };

  const recipient = normalizeRecipient(client.email);
  if (!recipient) return { status: "skipped", reason: "no_email" };

  const firstName = firstNameOf(client.name);
  const result = await enqueueAutomationEvent(
    {
      eventType: GALLERY_PUBLISHED_EVENT_TYPE,
      entityType: "gallery",
      entityId: gallery.id,
      idempotencyKey: galleryPublishedIdempotencyKey(gallery.id),
      payload: { galleryId: gallery.id, shootId: gallery.shootId },
      occurredAt: now,
      deliveries: [
        {
          templateKey: GALLERY_PUBLISHED_TEMPLATE_KEY,
          recipient,
          data: { ...(firstName ? { firstName } : {}), revealUrl: absoluteSiteUrl(portalPaths.reveal) },
        },
      ],
    },
    writer,
  );

  return { status: result.created ? "enqueued" : "replayed", eventId: result.event.id };
}
