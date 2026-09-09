// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transactionSelect: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: { select: mocks.select, insert: mocks.insert, transaction: mocks.transaction },
}));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { commitInventoryImport, previewInventoryImport } from "@/domain/inventory/import";
import { createInventoryImportTemplate, inventoryImportColumns } from "@/domain/inventory/import-template";

const actorUserId = "00000000-0000-4000-8000-000000000001";

function roleResult(role: string | undefined) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(role ? [{ role }] : []) }),
    }),
  };
}

function codeResult(rows: Array<{ id: string; code: string }>) {
  return {
    from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
  };
}

function spreadsheet(rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Acervo");
  return new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "acervo.xlsx");
}

describe("inventory spreadsheet import", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("INVENTORY_IMPORT_TOKEN_SECRET", "test-only-stable-secret-at-least-32-characters");
    mocks.select.mockReturnValue(codeResult([]));
    mocks.transaction.mockImplementation(async (operation) =>
      operation({ select: mocks.transactionSelect, insert: mocks.insert }),
    );
    mocks.transactionSelect.mockReturnValue(codeResult([]));
    mocks.recordAuditEvent.mockResolvedValue({ id: "audit-id" });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("uses a patched official SheetJS distribution", () => {
    const [major, minor, patch] = XLSX.version.split(".").map(Number);
    expect(major > 0 || minor > 20 || (minor === 20 && patch >= 2)).toBe(true);
  });

  it("confirms a preview after the server module restarts", async () => {
    const preview = await previewInventoryImport(spreadsheet([{ codigo: "OK", nome: "Vestido", tipo: "outfit" }]));
    vi.resetModules();
    const freshServer = await import("@/domain/inventory/import");
    mocks.select.mockReturnValue(roleResult("staff"));
    mocks.insert.mockReturnValue({ values: () => ({ returning: async () => [{ id: "new", code: "OK" }] }) });
    await expect(freshServer.commitInventoryImport(preview.previewToken, [2], actorUserId)).resolves.toEqual({ created: 1 });
  });

  it("reports actual worksheet row numbers across blank rows", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["codigo", "nome", "tipo"], ["A", "Vestido", "outfit"], [], [], ["B", "", "clutch"],
    ]), "Acervo");
    const preview = await previewInventoryImport(new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "test.xlsx"));
    expect(preview.rows.map((row) => row.rowNumber)).toEqual([2, 5]);
    expect(preview.rows[1].errors).toContain("nome é obrigatório");
  });

  it("fails clearly without a stable signing secret", async () => {
    vi.stubEnv("INVENTORY_IMPORT_TOKEN_SECRET", "");
    await expect(previewInventoryImport(spreadsheet([]))).rejects.toThrow(/INVENTORY_IMPORT_TOKEN_SECRET/);
  });

  it("rejects altered and expired tokens before a transaction", async () => {
    const preview = await previewInventoryImport(spreadsheet([{ codigo: "OK", nome: "Vestido", tipo: "outfit" }]));
    mocks.select.mockReturnValue(roleResult("staff"));
    await expect(commitInventoryImport(`${preview.previewToken}x`, [2], actorUserId)).rejects.toThrow(/inválida/);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    await expect(commitInventoryImport(preview.previewToken, [2], actorUserId)).rejects.toThrow(/expirada/);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("bounds preview rows and signed payload size", async () => {
    await expect(previewInventoryImport(spreadsheet(Array.from({ length: 501 }, (_, i) => ({ codigo: `A${i}`, nome: "Vestido", tipo: "outfit" }))))).rejects.toThrow(/limite/i);
    await expect(previewInventoryImport(spreadsheet(Array.from({ length: 100 }, (_, i) => ({ codigo: `B${i}`, nome: "Vestido", tipo: "outfit", descricao: "x".repeat(10000) }))))).rejects.toThrow(/limite/i);
    mocks.select.mockReturnValue(roleResult("staff"));
    await expect(commitInventoryImport("x".repeat(800000), [2], actorUserId)).rejects.toThrow(/inválida/);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a workbook with the exact import columns, an Acervo sheet, and instructions", () => {
    const workbook = XLSX.read(createInventoryImportTemplate(), { type: "array" });

    expect(workbook.SheetNames).toEqual(["Acervo", "Instruções"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Acervo!, { header: 1 })[0]).toEqual(inventoryImportColumns);
  });

  it("previews normalized rows and reports schema and duplicate errors without writing", async () => {
    mocks.select.mockReturnValue(codeResult([{ id: "existing-item", code: "DB-001" }]));

    const preview = await previewInventoryImport(
      spreadsheet([
        { codigo: " FILE-001 ", nome: " ", tipo: "outfit" },
        { codigo: "FILE-001", nome: "Vestido", tipo: "invalid" },
        { codigo: "DB-001", nome: "Clutch", tipo: "clutch" },
      ]),
    );

    expect(preview.rows).toEqual([
      expect.objectContaining({ rowNumber: 2, input: expect.objectContaining({ code: "FILE-001" }), errors: expect.arrayContaining([expect.stringMatching(/nome/i), expect.stringMatching(/duplicado/i)]) }),
      expect.objectContaining({ rowNumber: 3, errors: expect.arrayContaining([expect.stringMatching(/tipo/i), expect.stringMatching(/duplicado/i)]) }),
      expect.objectContaining({ rowNumber: 4, existingItemId: "existing-item", errors: expect.arrayContaining([expect.stringMatching(/cadastrado/i)]) }),
    ]);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("commits only explicitly selected valid preview rows and audits each creation", async () => {
    const preview = await previewInventoryImport(
      spreadsheet([
        { codigo: "OK-001", nome: "Vestido", tipo: "outfit" },
        { codigo: "BAD-001", nome: "", tipo: "clutch" },
        { codigo: "OK-002", nome: "Bolsa", tipo: "clutch", ativo: "false" },
      ]),
    );
    mocks.select.mockReturnValue(roleResult("staff"));
    mocks.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "created-item", code: "OK-001" }]),
      }),
    });

    await expect(commitInventoryImport(preview.previewToken, [2, 3], actorUserId)).resolves.toEqual({ created: 1 });

    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.insert.mock.results[0]!.value.values).toHaveBeenCalledWith(
      expect.objectContaining({ code: "OK-001", name: "Vestido", active: true }),
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId, action: "inventory_item.imported", entityId: "created-item" }),
      expect.anything(),
    );
  });
});
