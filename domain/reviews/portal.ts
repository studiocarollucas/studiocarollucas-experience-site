import "server-only";

import { and, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { galleries, productionJobs, reviews, shoots } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { isReviewPromptDue, REVIEW_REQUEST_TARGET } from "@/domain/automation/flows/rules";
import { studioDate } from "@/domain/automation/studio-time";
import { readGoogleReviewUrl } from "./config";
import { requestReviewInTransaction } from "./service";

// SCL-721: the review card of Minha Experiência. Always called with the client
// resolved from the session — never with ids sent by the browser.

export type ClientReviewPrompt = {
  shootId: string;
  reviewUrl: string;
};

type PortalReviewReader = Pick<typeof db, "select">;
type PortalReviewWriter = Pick<typeof db, "select" | "transaction">;

type ReadClientReviewPromptOptions = {
  now?: Date;
  database?: PortalReviewReader;
  /** Defaults to STUDIO_GOOGLE_REVIEW_URL, read at call time. */
  reviewUrl?: string | null;
};

/**
 * The card is offered for the client's most recently delivered shoot when the
 * post-delivery rule holds (job `entregue` + delivery date + published Reveal +
 * delay; see isReviewPromptDue), the link is configured and the Google Review of
 * that shoot is neither completed nor cancelled by staff.
 */
export async function readClientReviewPrompt(
  clientId: string,
  options: ReadClientReviewPromptOptions = {},
): Promise<ClientReviewPrompt | null> {
  const reviewUrl = options.reviewUrl === undefined ? readGoogleReviewUrl() : options.reviewUrl;
  if (!reviewUrl) return null;
  const database = options.database ?? db;
  const now = options.now ?? new Date();

  const [latest] = await database
    .select({
      shootId: shoots.id,
      shootStatus: shoots.status,
      productionStatus: productionJobs.status,
      deliveryAt: productionJobs.deliveryAt,
      galleryStatus: galleries.status,
    })
    .from(shoots)
    .innerJoin(productionJobs, eq(productionJobs.shootId, shoots.id))
    .innerJoin(galleries, eq(galleries.shootId, shoots.id))
    .where(
      and(
        eq(shoots.clientId, clientId),
        eq(productionJobs.status, "entregue"),
        isNotNull(productionJobs.deliveryAt),
        eq(galleries.status, "published"),
        ne(shoots.status, "cancelado"),
      ),
    )
    .orderBy(desc(productionJobs.deliveryAt), desc(shoots.id))
    .limit(1);
  if (!latest || !isReviewPromptDue(latest, studioDate(now))) return null;

  const [closed] = await database
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.shootId, latest.shootId),
        eq(reviews.target, REVIEW_REQUEST_TARGET),
        inArray(reviews.status, ["concluido", "cancelado"]),
      ),
    )
    .limit(1);
  if (closed) return null;

  return { shootId: latest.shootId, reviewUrl };
}

export type ReviewLinkOpenedResult = {
  /** false when the card is not offered anymore or the Review is already closed. */
  recorded: boolean;
  shootId: string | null;
};

/**
 * "Cliente abriu o link": re-derives the card on the server and, in one
 * transaction, makes sure the shoot has its Google Review (created with source
 * `portal` when the email flow has not asked yet — so the email never follows a
 * click) and audits `review.link_opened` with the client as actor.
 */
export async function recordReviewLinkOpened(
  input: { clientId: string; authUserId: string; now?: Date },
  database: PortalReviewWriter = db,
): Promise<ReviewLinkOpenedResult> {
  const prompt = await readClientReviewPrompt(input.clientId, { now: input.now, database });
  if (!prompt) return { recorded: false, shootId: null };

  return database.transaction(async (tx) => {
    const { review } = await requestReviewInTransaction(
      tx,
      {
        clientId: input.clientId,
        shootId: prompt.shootId,
        source: "portal",
        target: REVIEW_REQUEST_TARGET,
        targetUrl: prompt.reviewUrl,
      },
      input.authUserId,
    );
    if (review.status !== "solicitado") return { recorded: false, shootId: prompt.shootId };

    await recordAuditEvent(
      {
        actorUserId: input.authUserId,
        action: "review.link_opened",
        entityType: "review",
        entityId: review.id,
        before: null,
        after: { shootId: prompt.shootId, target: REVIEW_REQUEST_TARGET, via: "portal" },
      },
      tx,
    );
    return { recorded: true, shootId: prompt.shootId };
  });
}
