import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { automationEvents, galleries, reviews, shoots } from "@/db/schema";
import { readGoogleReviewUrl } from "@/domain/reviews/config";
import {
  decideGalleryPublishedDelivery,
  decideReviewRequestDelivery,
  decideShootReminderDelivery,
  decideShootWelcomeDelivery,
  GALLERY_PUBLISHED_EVENT_TYPE,
  reminderKindForEventType,
  REVIEW_REQUEST_EVENT_TYPE,
  SHOOT_WELCOME_EVENT_TYPE,
} from "./flows/rules";
import type { DeliveryGuard } from "./processor";
import { studioDate } from "./studio-time";

type GuardDatabase = Pick<typeof db, "select">;

/**
 * Send-time eligibility (SCL-701/702/703/704): reads the delivery's event and
 * the entity as it is *now*, so a reminder for a shoot cancelled or moved after
 * it was enqueued, a Reveal whose gallery is no longer published or a review
 * request already completed/cancelled (or without a configured link) is
 * cancelled instead of sent. Events without a rule are sent as before.
 */
export function createAutomationDeliveryGuard(database: GuardDatabase = db): DeliveryGuard {
  async function loadShoot(shootId: string) {
    const [shoot] = await database
      .select({ status: shoots.status, shootDate: shoots.shootDate })
      .from(shoots)
      .where(eq(shoots.id, shootId))
      .limit(1);
    return shoot ?? null;
  }

  return async (delivery, now) => {
    const [event] = await database
      .select({
        eventType: automationEvents.eventType,
        entityId: automationEvents.entityId,
        payload: automationEvents.payload,
      })
      .from(automationEvents)
      .where(eq(automationEvents.id, delivery.eventId))
      .limit(1);
    if (!event) return { send: false, reason: "evento de automação inexistente" };

    if (event.eventType === SHOOT_WELCOME_EVENT_TYPE) {
      return decideShootWelcomeDelivery(await loadShoot(event.entityId));
    }

    const reminderKind = reminderKindForEventType(event.eventType);
    if (reminderKind) {
      return decideShootReminderDelivery({
        kind: reminderKind,
        payload: event.payload,
        shoot: await loadShoot(event.entityId),
        today: studioDate(now),
      });
    }

    if (event.eventType === GALLERY_PUBLISHED_EVENT_TYPE) {
      const [gallery] = await database
        .select({ status: galleries.status })
        .from(galleries)
        .where(eq(galleries.id, event.entityId))
        .limit(1);
      return decideGalleryPublishedDelivery(gallery ?? null);
    }

    if (event.eventType === REVIEW_REQUEST_EVENT_TYPE) {
      const [review] = await database
        .select({ status: reviews.status })
        .from(reviews)
        .where(eq(reviews.id, event.entityId))
        .limit(1);
      return decideReviewRequestDelivery({
        review: review ?? null,
        reviewUrlConfigured: readGoogleReviewUrl() !== null,
      });
    }

    return { send: true };
  };
}
