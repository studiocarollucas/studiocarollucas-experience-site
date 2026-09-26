import "server-only";

import { eq } from "drizzle-orm";
import { clients, type Shoot } from "@/db/schema";
import { enqueueAutomationEvent, type AutomationWriter } from "../events";
import { absoluteSiteUrl, portalPaths } from "../links";
import { firstNameOf, normalizeRecipient } from "../recipients";
import {
  isWelcomeEligible,
  shootWelcomeIdempotencyKey,
  SHOOT_WELCOME_EVENT_TYPE,
  toTemplateTime,
  WELCOME_TEMPLATE_KEY,
} from "./rules";

export type ShootWelcomeResult =
  | { status: "enqueued" | "replayed"; eventId: string }
  | { status: "skipped"; reason: "not_upcoming" | "no_client" | "no_email" };

type WelcomeShoot = Pick<Shoot, "id" | "clientId" | "status" | "shootDate" | "startTime" | "portalEnabled">;

/**
 * SCL-701: enqueue the welcome for a confirmed reservation inside the caller's
 * transaction (`tx` of createConfirmedShoot), so the email exists iff the shoot
 * does. Keyed per shoot: replays never add a second email. A client without a
 * usable email is skipped instead of failing the reservation.
 */
export async function enqueueShootWelcome(
  shoot: WelcomeShoot,
  writer: AutomationWriter,
  now: Date = new Date(),
): Promise<ShootWelcomeResult> {
  if (!isWelcomeEligible(shoot, now)) return { status: "skipped", reason: "not_upcoming" };

  const [client] = await writer
    .select({ name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.id, shoot.clientId))
    .limit(1);
  if (!client) return { status: "skipped", reason: "no_client" };

  const recipient = normalizeRecipient(client.email);
  if (!recipient) return { status: "skipped", reason: "no_email" };

  const firstName = firstNameOf(client.name);
  const startTime = toTemplateTime(shoot.startTime);
  const result = await enqueueAutomationEvent(
    {
      eventType: SHOOT_WELCOME_EVENT_TYPE,
      entityType: "shoot",
      entityId: shoot.id,
      idempotencyKey: shootWelcomeIdempotencyKey(shoot.id),
      payload: { shootId: shoot.id },
      occurredAt: now,
      deliveries: [
        {
          templateKey: WELCOME_TEMPLATE_KEY,
          recipient,
          data: {
            ...(firstName ? { firstName } : {}),
            shootDate: shoot.shootDate,
            ...(startTime ? { startTime } : {}),
            ...(shoot.portalEnabled ? { portalUrl: absoluteSiteUrl(portalPaths.home) } : {}),
          },
        },
      ],
    },
    writer,
  );

  return { status: result.created ? "enqueued" : "replayed", eventId: result.event.id };
}
