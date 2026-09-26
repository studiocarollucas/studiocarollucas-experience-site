import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { automationEvents, galleries, shoots } from "@/db/schema";
import {
  decideGalleryPublishedDelivery,
  decideShootReminderDelivery,
  decideShootWelcomeDelivery,
  GALLERY_PUBLISHED_EVENT_TYPE,
  reminderKindForEventType,
  SHOOT_WELCOME_EVENT_TYPE,
} from "./flows/rules";
import type { DeliveryGuard } from "./processor";
import { studioDate } from "./studio-time";

type GuardDatabase = Pick<typeof db, "select">;

/**
 * Send-time eligibility (SCL-701/702/703): reads the delivery's event and the
 * entity as it is *now*, so a reminder for a shoot cancelled or moved after it
 * was enqueued — or a Reveal whose gallery is no longer published — is
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

    return { send: true };
  };
}
