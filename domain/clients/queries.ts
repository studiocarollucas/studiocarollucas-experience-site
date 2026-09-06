import { or, ilike, sql, asc, desc, count, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, shoots, experiencePackages, payments, type Client } from "@/db/schema";
import { calculateBalance } from "@/domain/payments/balance";
import { addDecimal } from "@/lib/money";

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

export type ClientShootSummary = {
  id: string;
  packageName: string;
  shootDate: string;
  status: string;
  agreedPrice: string;
  confirmedPaid: string;
  balance: string;
};

export type ClientDetail = {
  client: Client;
  shoots: ClientShootSummary[];
  lifetimeRevenue: string;
  openBalance: string;
};

/**
 * Pure aggregation of a client's shoot history. All money is derived on the fly
 * (PRD §7.2 — no stored aggregates): per-shoot `balance` from `calculateBalance`
 * (agreed price minus confirmed payments), every decimal-string sum via
 * `addDecimal` from `@/lib/money` (fixed-point cents, never parseFloat).
 */
export function summarizeClientHistory(
  shootRows: { id: string; packageName: string; shootDate: string; status: string; agreedPrice: string }[],
  paymentRows: { shootId: string; amount: string; status: "pendente" | "confirmado" | "estornado" }[],
): { rows: ClientShootSummary[]; lifetimeRevenue: string; openBalance: string } {
  const byShoot = new Map<string, typeof paymentRows>();
  for (const p of paymentRows) {
    const list = byShoot.get(p.shootId) ?? [];
    list.push(p);
    byShoot.set(p.shootId, list);
  }

  let lifetimeRevenue = "0.00";
  let openBalance = "0.00";

  const rows = shootRows.map((s): ClientShootSummary => {
    const ps = byShoot.get(s.id) ?? [];
    const confirmedPaid = ps
      .filter((p) => p.status === "confirmado")
      .reduce((acc, p) => addDecimal(acc, p.amount), "0.00");
    const balance = calculateBalance(s.agreedPrice, ps);
    lifetimeRevenue = addDecimal(lifetimeRevenue, confirmedPaid);
    // A cancelled shoot's unpaid remainder is not an open balance — the studio is
    // not going to collect it. The row still shows its own balance; only the
    // aggregate skips it.
    if (s.status !== "cancelado" && !balance.startsWith("-") && balance !== "0.00") {
      openBalance = addDecimal(openBalance, balance);
    }
    return {
      id: s.id,
      packageName: s.packageName,
      shootDate: s.shootDate,
      status: s.status,
      agreedPrice: s.agreedPrice,
      confirmedPaid,
      balance,
    };
  });

  return { rows, lifetimeRevenue, openBalance };
}

export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) return null;

  const shootRows = await db
    .select({
      id: shoots.id,
      packageName: experiencePackages.name,
      shootDate: shoots.shootDate,
      status: shoots.status,
      agreedPrice: shoots.agreedPrice,
    })
    .from(shoots)
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(eq(shoots.clientId, id))
    .orderBy(desc(shoots.shootDate));

  const shootIds = shootRows.map((s) => s.id);
  const paymentRows = shootIds.length
    ? await db
        .select({ shootId: payments.shootId, amount: payments.amount, status: payments.status })
        .from(payments)
        .where(inArray(payments.shootId, shootIds))
    : [];

  const { rows, lifetimeRevenue, openBalance } = summarizeClientHistory(shootRows, paymentRows);
  return { client, shoots: rows, lifetimeRevenue, openBalance };
}

export async function listClientOptions(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(asc(clients.name));
}
