import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { inArray } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "@/db/client";
import { inventoryItems, type InventoryItem } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { createInventoryItemSchema } from "./schema";
import { requireInventoryCatalogActor } from "./authorization";
import { inventoryImportColumns } from "./import-template";

type ImportInput = {
  code: string;
  name: string;
  description?: string;
  type: string;
  color?: string;
  size?: string;
  status?: string;
  internalPrice?: string;
  active?: boolean | string;
};

export type InventoryImportPreviewRow = {
  rowNumber: number;
  input: ImportInput;
  errors: string[];
  existingItemId?: string;
};

export type InventoryImportPreview = {
  previewToken: string;
  rows: InventoryImportPreviewRow[];
};

type StoredPreview = {
  expiresAt: number;
  rows: InventoryImportPreviewRow[];
};

const previewStore = new Map<string, StoredPreview>();
const previewLifetimeMs = 15 * 60 * 1000;
const previewTokenSecret = process.env.INVENTORY_IMPORT_TOKEN_SECRET ?? randomUUID();

function signPreview(id: string, expiresAt: number): string {
  return createHmac("sha256", previewTokenSecret).update(`${id}.${expiresAt}`).digest("base64url");
}

function createPreviewToken(id: string, expiresAt: number): string {
  return `${id}.${expiresAt}.${signPreview(id, expiresAt)}`;
}

function readPreviewToken(token: string): StoredPreview {
  const [id, expiresAtText, signature, ...rest] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (!id || !signature || rest.length || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("prévia de importação expirada ou inválida");
  }
  const expected = signPreview(id, expiresAt);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("prévia de importação expirada ou inválida");
  }
  const preview = previewStore.get(id);
  if (!preview || preview.expiresAt !== expiresAt) throw new Error("prévia de importação expirada ou inválida");
  return preview;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function optionalValue(value: unknown): string | undefined {
  const normalized = stringValue(value);
  return normalized || undefined;
}

function activeValue(value: unknown): boolean | string | undefined {
  const normalized = stringValue(value).toLowerCase();
  if (!normalized) return undefined;
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "não", "nao", "no"].includes(normalized)) return false;
  return normalized;
}

function normalizeRow(row: Record<string, unknown>): ImportInput {
  return {
    code: stringValue(row.codigo),
    name: stringValue(row.nome),
    type: stringValue(row.tipo),
    description: optionalValue(row.descricao),
    color: optionalValue(row.cor),
    size: optionalValue(row.tamanho),
    status: optionalValue(row.status),
    internalPrice: optionalValue(row.preco_interno),
    active: activeValue(row.ativo),
  };
}

function validationErrors(input: ImportInput): string[] {
  const result = createInventoryItemSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const field = String(issue.path[0] ?? "linha");
    if (field === "name") return "nome é obrigatório";
    if (field === "type") return "tipo inválido";
    if (field === "code") return "código é obrigatório";
    if (field === "status") return "status inválido";
    if (field === "active") return "ativo inválido";
    if (field === "internalPrice") return "preço interno inválido";
    return issue.message;
  });
}

async function findExistingCodes(codes: string[]): Promise<Map<string, InventoryItem>> {
  if (!codes.length) return new Map();
  const rows = await db.select().from(inventoryItems).where(inArray(inventoryItems.code, codes));
  return new Map(rows.map((row) => [row.code, row]));
}

export async function previewInventoryImport(file: File): Promise<InventoryImportPreview> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const worksheet = workbook.Sheets.Acervo;
  if (!worksheet) throw new Error("a planilha deve conter a aba Acervo");
  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: false });
  const rows = sourceRows.map((source, index) => ({
    rowNumber: index + 2,
    input: normalizeRow(Object.fromEntries(inventoryImportColumns.map((column) => [column, source[column]]))),
    errors: [] as string[],
  }));

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.input.code) counts.set(row.input.code, (counts.get(row.input.code) ?? 0) + 1);
    row.errors.push(...validationErrors(row.input));
  }
  for (const row of rows) {
    if (row.input.code && (counts.get(row.input.code) ?? 0) > 1) row.errors.push("código duplicado no arquivo");
  }

  const existingCodes = await findExistingCodes([...counts.keys()]);
  const previewRows: InventoryImportPreviewRow[] = rows.map((row) => {
    const existing = existingCodes.get(row.input.code);
    return {
      ...row,
      ...(existing ? { existingItemId: existing.id, errors: [...row.errors, "código já cadastrado"] } : {}),
    };
  });
  const id = randomUUID();
  const expiresAt = Date.now() + previewLifetimeMs;
  previewStore.set(id, { expiresAt, rows: previewRows });
  return { previewToken: createPreviewToken(id, expiresAt), rows: previewRows };
}

export async function commitInventoryImport(
  previewToken: string,
  selectedRowNumbers: number[],
  actorUserId: string,
): Promise<{ created: number }> {
  await requireInventoryCatalogActor(actorUserId);
  const preview = readPreviewToken(previewToken);
  const selected = preview.rows.filter(
    (row) => selectedRowNumbers.includes(row.rowNumber) && row.errors.length === 0,
  );
  const inputs = selected.map((row) => createInventoryItemSchema.parse(row.input));

  const created = await db.transaction(async (tx) => {
    const codes = inputs.map((input) => input.code);
    if (codes.length) {
      const existing = await tx.select({ code: inventoryItems.code }).from(inventoryItems).where(inArray(inventoryItems.code, codes));
      if (existing.length) throw new Error("um código selecionado já foi cadastrado");
    }
    let count = 0;
    for (const input of inputs) {
      const [item] = await tx.insert(inventoryItems).values(input).returning();
      if (!item) throw new Error("falha ao importar item de acervo");
      await recordAuditEvent(
        {
          actorUserId,
          action: "inventory_item.imported",
          entityType: "inventory_item",
          entityId: item.id,
          before: null,
          after: item,
        },
        tx,
      );
      count += 1;
    }
    return count;
  });
  return { created };
}
