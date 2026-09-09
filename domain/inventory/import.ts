import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
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

const previewLifetimeMs = 15 * 60 * 1000;
const maxPreviewBytes = 512 * 1024;
const maxTokenLength = Math.ceil(maxPreviewBytes / 3) * 4 + 44;
const maxImportRows = 500;

export class InventoryImportConfigurationError extends Error {
  constructor() {
    super("Importação indisponível: configure INVENTORY_IMPORT_TOKEN_SECRET com pelo menos 32 bytes em todas as instâncias.");
    this.name = "InventoryImportConfigurationError";
  }
}

function previewSecret(): string {
  const secret = process.env.INVENTORY_IMPORT_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new InventoryImportConfigurationError();
  }
  return secret;
}

function signPreview(payload: string): string {
  return createHmac("sha256", previewSecret()).update(`inventory-import:v1:${payload}`).digest("base64url");
}

function createPreviewToken(preview: StoredPreview): string {
  const bytes = Buffer.from(JSON.stringify({ version: 1, ...preview }));
  if (bytes.length > maxPreviewBytes) throw new Error("a prévia excede o limite de 512 KiB; divida o arquivo");
  const payload = bytes.toString("base64url");
  return `${payload}.${signPreview(payload)}`;
}

function readPreviewToken(token: string): StoredPreview {
  if (typeof token !== "string" || token.length > maxTokenLength) {
    throw new Error("prévia de importação expirada ou inválida");
  }
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    throw new Error("prévia de importação expirada ou inválida");
  }
  const expected = signPreview(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("prévia de importação expirada ou inválida");
  }
  try {
    const preview = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (preview.version !== 1 || !Number.isSafeInteger(preview.expiresAt) || preview.expiresAt <= Date.now() ||
        !Array.isArray(preview.rows) || preview.rows.length > maxImportRows) throw new Error();
    return preview;
  } catch {
    throw new Error("prévia de importação expirada ou inválida");
  }
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
  previewSecret();
  if (file.size > 4 * 1024 * 1024) throw new Error("o arquivo excede o limite de 4 MiB");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", sheetRows: 10002 });
  const worksheet = workbook.Sheets.Acervo;
  if (!worksheet) throw new Error("a planilha deve conter a aba Acervo");
  const range = worksheet["!fullref"] ?? worksheet["!ref"];
  if (range && XLSX.utils.decode_range(range).e.r > 10000) throw new Error("a planilha excede o limite de 10000 linhas");
  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: false });
  if (sourceRows.length > maxImportRows) throw new Error("o arquivo excede o limite de 500 itens");
  const rows = sourceRows.map((source) => ({
    rowNumber: Number(source.__rowNum__) + 1,
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
  const expiresAt = Date.now() + previewLifetimeMs;
  return { previewToken: createPreviewToken({ expiresAt, rows: previewRows }), rows: previewRows };
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
