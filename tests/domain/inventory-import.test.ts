// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    mocks.select.mockReturnValue(codeResult([]));
    mocks.transaction.mockImplementation(async (operation) =>
      operation({ select: mocks.transactionSelect, insert: mocks.insert }),
    );
    mocks.transactionSelect.mockReturnValue(codeResult([]));
    mocks.recordAuditEvent.mockResolvedValue({ id: "audit-id" });
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
