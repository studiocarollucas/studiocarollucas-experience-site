import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, profiles } from "@/db/schema";
import { leadStatusValues } from "@/domain/leads/schema";

export type LeadListRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  occasion: string | null;
  quizResult: string | null;
  status: (typeof leadStatusValues)[number];
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
};

export type LeadListResult = {
  rows: LeadListRow[];
  total: number;
  page: number;
  limit: number;
};

type LeadListInput = {
  query?: string;
  status?: string;
  source?: string;
  ownerId?: string;
  page?: string | number;
  limit?: string | number;
};

export function normalizeLeadListParams(raw: LeadListInput): Required<Pick<LeadListInput, "page" | "limit">> & Omit<LeadListInput, "page" | "limit"> {
  const trim = (value: string | undefined) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
  const status = trim(raw.status);
  const page = Math.max(1, Math.floor(Number(raw.page ?? 1)) || 1);
  const parsedLimit = Math.floor(Number(raw.limit ?? 25)) || 25;

  return {
    query: trim(raw.query),
    status: status && leadStatusValues.includes(status as (typeof leadStatusValues)[number]) ? status : undefined,
    source: trim(raw.source),
    ownerId: trim(raw.ownerId),
    page,
    limit: Math.min(100, Math.max(1, parsedLimit)),
  };
}

export function buildLeadSearchPredicate(query: string | undefined): SQL | undefined {
  if (!query) return undefined;
  const like = `%${query}%`;
  return or(ilike(leads.name, like), ilike(leads.phone, like), ilike(leads.email, like));
}

function buildLeadListPredicate(params: ReturnType<typeof normalizeLeadListParams>): SQL | undefined {
  const filters = [
    buildLeadSearchPredicate(params.query),
    params.status ? eq(leads.status, params.status) : undefined,
    params.source ? eq(leads.source, params.source) : undefined,
    params.ownerId ? eq(leads.owner, params.ownerId) : undefined,
  ].filter((filter): filter is SQL => Boolean(filter));

  return filters.length ? and(...filters) : undefined;
}

export async function listLeads(input: LeadListInput): Promise<LeadListResult> {
  const params = normalizeLeadListParams(input);
  const where = buildLeadListPredicate(params);

  const [{ total }] = await db
    .select({ total: count() })
    .from(leads)
    .where(where ?? sql`true`);

  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      phone: leads.phone,
      email: leads.email,
      source: leads.source,
      occasion: leads.occasion,
      quizResult: leads.quizResult,
      status: leads.status,
      ownerId: leads.owner,
      ownerName: profiles.fullName,
      createdAt: sql<string>`${leads.createdAt}::text`,
    })
    .from(leads)
    .leftJoin(profiles, eq(leads.owner, profiles.id))
    .where(where ?? sql`true`)
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(params.limit)
    .offset((params.page - 1) * params.limit);

  return { rows, total: Number(total), page: params.page, limit: params.limit };
}
