import { boolean, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const contractStatusEnum = pgEnum("contract_status", ["issued", "voided"]);
export const contractStatusValues = ["issued", "voided"] as const;

export type ContractSnapshot = {
  contractor: { name: string; cpf: string; address: string };
  client: { name: string; cpf: string; birthday: string; address: string; phone: string | null };
  shoot: {
    date: string;
    startTime: string | null;
    locationName: string | null;
    locationAddress: string | null;
  };
  package: {
    name: string;
    description: string | null;
    durationMinutes: number;
    includedPhotos: number;
    scenes: string | null;
  };
  finance: { agreedPrice: string; confirmedPaid: string; balance: string };
  terms: {
    rescheduleFee: "50.00";
    rescheduleWindowDays: 15;
    refundWindowDays: 30;
    imageUsageAuthorized: boolean;
  };
};

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey(),
    contractNumber: text("contract_number").notNull(),
    shootId: uuid("shoot_id").notNull(),
    clientId: uuid("client_id").notNull(),
    status: contractStatusEnum("status").notNull().default("issued"),
    templateVersion: text("template_version").notNull(),
    issuedByAuthUserId: uuid("issued_by_auth_user_id").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    imageUsageAuthorized: boolean("image_usage_authorized").notNull(),
    snapshot: jsonb("snapshot").$type<ContractSnapshot>().notNull(),
    pdfStoragePath: text("pdf_storage_path").notNull(),
  },
  (table) => [
    unique("contracts_contract_number_unique").on(table.contractNumber),
    unique("contracts_pdf_storage_path_unique").on(table.pdfStoragePath),
  ],
);

export type Contract = typeof contracts.$inferSelect;
