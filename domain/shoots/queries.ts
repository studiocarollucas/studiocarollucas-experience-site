import { and, or, ilike, eq, gte, lte, desc, count, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  shoots,
  clients,
  experiencePackages,
  payments as paymentsTable,
  productionJobs,
  preparationTasks,
  inventoryItems,
  inventoryReservations,
  type Shoot,
  type Payment,
  type ProductionJob,
  type PreparationTask,
} from "@/db/schema";
import { calculateBalance } from "@/domain/payments/balance";
import { shootStatusValues } from "./schema";

export type ShootListRow = {
  id: string;
  clientName: string;
  packageName: string;
  shootDate: string;
  startTime: string | null;
  status: string;
  paymentStatus: string;
  agreedPrice: string;
};

export type ShootListResult = {
  rows: ShootListRow[];
  total: number;
  page: number;
  pageSize: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeShootFilters(raw: {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string | number;
}): { search?: string; status?: string; from?: string; to?: string; page: number; pageSize: number } {
  const search = typeof raw.search === "string" && raw.search.trim() !== "" ? raw.search.trim() : undefined;
  const status =
    typeof raw.status === "string" && (shootStatusValues as readonly string[]).includes(raw.status)
      ? raw.status
      : undefined;
  const from = typeof raw.from === "string" && ISO_DATE.test(raw.from) ? raw.from : undefined;
  const to = typeof raw.to === "string" && ISO_DATE.test(raw.to) ? raw.to : undefined;
  const page = Math.max(1, Math.floor(Number(raw.page ?? 1)) || 1);
  return { search, status, from, to, page, pageSize: 25 };
}

export async function listShoots(params: Parameters<typeof normalizeShootFilters>[0]): Promise<ShootListResult> {
  const f = normalizeShootFilters(params);

  const predicates: SQL[] = [];
  if (f.search) {
    const like = `%${f.search}%`;
    predicates.push(or(ilike(clients.name, like), ilike(experiencePackages.name, like)) as SQL);
  }
  if (f.status) predicates.push(eq(shoots.status, f.status as (typeof shootStatusValues)[number]));
  if (f.from) predicates.push(gte(shoots.shootDate, f.from));
  if (f.to) predicates.push(lte(shoots.shootDate, f.to));
  const where = predicates.length ? and(...predicates) : sql`true`;

  const [{ total }] = await db
    .select({ total: count() })
    .from(shoots)
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(where);

  const rows = await db
    .select({
      id: shoots.id,
      clientName: clients.name,
      packageName: experiencePackages.name,
      shootDate: shoots.shootDate,
      startTime: shoots.startTime,
      status: shoots.status,
      paymentStatus: shoots.paymentStatus,
      agreedPrice: shoots.agreedPrice,
    })
    .from(shoots)
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(where)
    .orderBy(desc(shoots.shootDate))
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  return { rows, total: Number(total), page: f.page, pageSize: f.pageSize };
}

export type ShootDetail = {
  shoot: Shoot;
  clientName: string;
  clientId: string;
  packageName: string;
  payments: Payment[];
  balance: string;
  productionJob: ProductionJob | null;
  preparationTasks: PreparationTask[];
  inventoryReservations: Array<{
    id: string;
    itemName: string;
    itemCode: string;
    itemType: string;
    startsOn: string;
    endsOn: string;
    status: string;
    overrideReason: string | null;
  }>;
};

export async function getShootDetail(id: string): Promise<ShootDetail | null> {
  const [row] = await db
    .select({
      shoot: shoots,
      clientName: clients.name,
      clientId: clients.id,
      packageName: experiencePackages.name,
    })
    .from(shoots)
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(eq(shoots.id, id))
    .limit(1);
  if (!row) return null;

  const shootPayments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.shootId, id))
    .orderBy(desc(paymentsTable.createdAt));

  const [job] = await db
    .select()
    .from(productionJobs)
    .where(eq(productionJobs.shootId, id))
    .limit(1);

  const prep = await db
    .select()
    .from(preparationTasks)
    .where(eq(preparationTasks.shootId, id))
    .orderBy(preparationTasks.createdAt);

  const reservations = await db
    .select({
      id: inventoryReservations.id,
      itemName: inventoryItems.name,
      itemCode: inventoryItems.code,
      itemType: inventoryItems.type,
      startsOn: inventoryReservations.startsOn,
      endsOn: inventoryReservations.endsOn,
      status: inventoryReservations.status,
      overrideReason: inventoryReservations.overrideReason,
    })
    .from(inventoryReservations)
    .innerJoin(inventoryItems, eq(inventoryReservations.inventoryItemId, inventoryItems.id))
    .where(eq(inventoryReservations.shootId, id))
    .orderBy(inventoryReservations.startsOn);

  return {
    shoot: row.shoot,
    clientName: row.clientName,
    clientId: row.clientId,
    packageName: row.packageName,
    payments: shootPayments,
    balance: calculateBalance(
      row.shoot.agreedPrice,
      shootPayments.map((p) => ({ amount: p.amount, status: p.status })),
    ),
    productionJob: job ?? null,
    preparationTasks: prep,
    inventoryReservations: reservations,
  };
}
