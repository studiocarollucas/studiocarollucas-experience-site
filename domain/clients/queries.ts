import { or, ilike, sql, desc, count, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";

export type ClientListRow = {
  id: string;
  name: string;
  phone: string | null;
  instagramHandle: string | null;
  createdAt: string;
};

export type ClientListResult = {
  rows: ClientListRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function normalizeListParams(raw: {
  search?: string;
  page?: string | number;
  pageSize?: string | number;
}): { search?: string; page: number; pageSize: number } {
  const trimmed = typeof raw.search === "string" ? raw.search.trim() : "";
  const pageNum = Math.max(1, Math.floor(Number(raw.page ?? 1)) || 1);
  const sizeRaw = Math.floor(Number(raw.pageSize ?? 25)) || 25;
  const pageSize = Math.min(100, Math.max(1, sizeRaw));
  return { search: trimmed === "" ? undefined : trimmed, page: pageNum, pageSize };
}

export function buildClientSearchPredicate(search: string | undefined): SQL | undefined {
  if (!search) return undefined;
  const like = `%${search}%`;
  return or(
    ilike(clients.name, like),
    ilike(clients.phone, like),
    ilike(clients.email, like),
    ilike(clients.instagramHandle, like),
  );
}

export async function listClients(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ClientListResult> {
  const { search, page, pageSize } = normalizeListParams(params);
  const where = buildClientSearchPredicate(search);

  const [{ total }] = await db
    .select({ total: count() })
    .from(clients)
    .where(where ?? sql`true`);

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      instagramHandle: clients.instagramHandle,
      createdAt: sql<string>`${clients.createdAt}::text`,
    })
    .from(clients)
    .where(where ?? sql`true`)
    .orderBy(desc(clients.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total: Number(total), page, pageSize };
}
