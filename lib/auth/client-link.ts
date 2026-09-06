import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";

type ClientMatch = { id: string; authUserId: string | null };

export type ClientLinkDecision =
  | { kind: "link" | "linked"; clientId: string }
  | { kind: "denied"; reason: "no_match" | "ambiguous" | "owned_by_another_user" };

export class ClientAccessUnavailableError extends Error {
  constructor(public readonly reason: Extract<ClientLinkDecision, { kind: "denied" }>["reason"]) {
    super("client access unavailable");
    this.name = "ClientAccessUnavailableError";
  }
}

export function normalizeClientEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function decideClientLink(matches: ClientMatch[], authUserId: string): ClientLinkDecision {
  if (matches.length === 0) return { kind: "denied", reason: "no_match" };
  if (matches.length !== 1) return { kind: "denied", reason: "ambiguous" };
  const match = matches[0];
  if (match.authUserId === authUserId) return { kind: "linked", clientId: match.id };
  if (match.authUserId) return { kind: "denied", reason: "owned_by_another_user" };
  return { kind: "link", clientId: match.id };
}

export async function linkAuthUserToClient(user: {
  id: string;
  email: string;
}): Promise<{ clientId: string }> {
  const normalized = normalizeClientEmail(user.email);
  const matches = await db
    .select({ id: clients.id, authUserId: clients.authUserId })
    .from(clients)
    .where(sql`lower(trim(${clients.email})) = ${normalized}`)
    .limit(2);
  const decision = decideClientLink(matches, user.id);
  if (decision.kind === "denied") throw new ClientAccessUnavailableError(decision.reason);
  if (decision.kind === "linked") return { clientId: decision.clientId };

  const [linked] = await db
    .update(clients)
    .set({ authUserId: user.id })
    .where(and(eq(clients.id, decision.clientId), isNull(clients.authUserId)))
    .returning({ id: clients.id });
  if (linked) return { clientId: linked.id };

  const [raced] = await db
    .select({ id: clients.id, authUserId: clients.authUserId })
    .from(clients)
    .where(eq(clients.id, decision.clientId))
    .limit(1);
  if (raced?.authUserId === user.id) return { clientId: raced.id };
  throw new ClientAccessUnavailableError("owned_by_another_user");
}

export async function getLinkedClientByAuthUserId(
  authUserId: string
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.authUserId, authUserId))
    .limit(1);
  return row ?? null;
}
