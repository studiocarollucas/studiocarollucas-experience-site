// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  audit: vi.fn(),
  storage: vi.fn(),
  download: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/db/client", () => ({ db: { select: mocks.select, transaction: mocks.transaction } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.audit }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ storage: { from: mocks.storage } }),
}));

import * as clutch from "@/domain/inventory/clutch";
import { updatePaixaoClutchSchema } from "@/domain/inventory/clutch-schema";

const itemId = "00000000-0000-4000-8000-000000000001";
const mediaId = "00000000-0000-4000-8000-000000000002";
const actorId = "00000000-0000-4000-8000-000000000003";
type Row = Record<string, unknown>;
let rows: Record<string, Row[]>;
let role: string;
const jpeg = () =>
  new File([new Uint8Array([255, 216, 255, 224, 0, 16])], "private.jpg", { type: "image/jpeg" });

function matches(row: Row, condition: Parameters<PgDialect["sqlToQuery"]>[0]) {
  const query = new PgDialect().sqlToQuery(condition);
  return [...query.sql.matchAll(/"\w+"\."(\w+)" = \$(\d+)/g)].every(([, column, index]) => {
    const key = column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return row[key] === query.params[Number(index) - 1];
  });
}
function database() {
  return {
    execute: async () => [],
    select: () => ({
      from: (table: Parameters<typeof getTableName>[0]) => ({
        where: (condition: Parameters<typeof matches>[1]) => {
          const result = rows[getTableName(table)].filter((row) => matches(row, condition));
          return Object.assign(Promise.resolve(result), {
            limit: () =>
              Object.assign(Promise.resolve(result.slice(0, 1)), {
                for: async () => result.slice(0, 1),
              }),
            for: async () => result,
          });
        },
      }),
    }),
    insert: (table: Parameters<typeof getTableName>[0]) => ({
      values: (row: Row) => {
        rows[getTableName(table)].push({ state: "pending", ...row });
        return { returning: async () => [row] };
      },
    }),
    update: (table: Parameters<typeof getTableName>[0]) => ({
      set: (patch: Row) => ({
        where: (condition: Parameters<typeof matches>[1]) => {
          const updated = rows[getTableName(table)].filter((row) => matches(row, condition));
          updated.forEach((row) => Object.assign(row, patch));
          return Object.assign(Promise.resolve(updated), { returning: async () => updated });
        },
      }),
    }),
    delete: (table: Parameters<typeof getTableName>[0]) => ({
      where: async (condition: Parameters<typeof matches>[1]) => {
        rows[getTableName(table)] = rows[getTableName(table)].filter(
          (row) => !matches(row, condition)
        );
      },
    }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  role = "staff";
  rows = {
    inventory_items: [
      {
        id: itemId,
        type: "clutch",
        active: true,
        status: "available",
        paixaoClutchPublicImagePath: null,
        paixaoClutchPublished: false,
      },
    ],
    inventory_media: [
      {
        id: mediaId,
        inventoryItemId: itemId,
        storagePath: `inventory-media/${itemId}/${mediaId}.jpg`,
        deletionRequestedAt: null,
      },
    ],
    inventory_public_media: [],
  };
  mocks.select.mockImplementation(() => ({
    from: () => ({ where: () => ({ limit: async () => (role ? [{ role }] : []) }) }),
  }));
  mocks.transaction.mockImplementation(async (operation) => {
    const snapshot = structuredClone(rows);
    try {
      return await operation(database());
    } catch (error) {
      rows = snapshot;
      throw error;
    }
  });
  mocks.storage.mockImplementation((bucket) =>
    bucket === "inventory-media"
      ? { download: mocks.download }
      : { upload: mocks.upload, remove: mocks.remove }
  );
  mocks.download.mockResolvedValue({ data: jpeg(), error: null });
  mocks.upload.mockResolvedValue({ data: { path: "generated" }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
});

describe("public clutch media lifecycle", () => {
  it("copies private bytes to a separately generated public object and audits", async () => {
    const result = await clutch.promoteInventoryMedia({ itemId, mediaId }, actorId);
    expect(result.publicPath).toMatch(
      /^https:\/\/project.supabase.co\/storage\/v1\/object\/public\/paixao-clutch-media\/paixao-clutch\//
    );
    expect(mocks.download).toHaveBeenCalledWith(rows.inventory_media[0].storagePath);
    const [path, file, options] = mocks.upload.mock.calls[0];
    expect(path).not.toContain("inventory-media");
    expect(file).toBeInstanceOf(File);
    expect(await file.arrayBuffer()).toEqual(await jpeg().arrayBuffer());
    expect(options).toEqual({ contentType: "image/jpeg", upsert: false, cacheControl: "0" });
    expect(rows.inventory_items[0].paixaoClutchPublicImagePath).toBe(result.publicPath);
    expect(rows.inventory_public_media[0]).toMatchObject({
      sourceMediaId: mediaId,
      state: "ready",
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "inventory_public_media.promoted", actorUserId: actorId }),
      expect.anything()
    );
  });
  it("rejects media from another item before reading any bytes", async () => {
    rows.inventory_media[0].inventoryItemId = actorId;
    await expect(clutch.promoteInventoryMedia({ itemId, mediaId }, actorId)).rejects.toThrow(
      /mídia.*item/i
    );
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it("rejects a private media tombstone", async () => {
    rows.inventory_media[0].deletionRequestedAt = new Date();
    await expect(clutch.promoteInventoryMedia({ itemId, mediaId }, actorId)).rejects.toThrow(
      /mídia.*item/i
    );
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it.each(["client", "", "contractor"])("denies %s before accessing storage", async (value) => {
    role = value;
    await expect(
      clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId)
    ).rejects.toThrow(/não autorizado/i);
    await expect(clutch.promoteInventoryMedia({ itemId, mediaId }, actorId)).rejects.toThrow(
      /não autorizado/i
    );
    await expect(clutch.removeInventoryPublicMedia({ itemId }, actorId)).rejects.toThrow(
      /não autorizado/i
    );
    expect(mocks.storage).not.toHaveBeenCalled();
  });
  it.each([
    new File(["svg"], "a.svg", { type: "image/svg+xml" }),
    new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" }),
  ])("rejects unsupported or oversized files", async (file) => {
    await expect(clutch.uploadInventoryPublicMedia({ itemId, file }, actorId)).rejects.toThrow();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects non-clutch items", async () => {
    rows.inventory_items[0].type = "outfit";
    await expect(
      clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId)
    ).rejects.toThrow(/clutch/i);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("compensates the uploaded object when the final audit aborts the database change", async () => {
    mocks.audit.mockImplementation(async (event) => {
      if (event.action === "inventory_public_media.uploaded") throw new Error("audit down");
    });
    await expect(
      clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId)
    ).rejects.toThrow();
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
    expect(rows.inventory_items[0].paixaoClutchPublicImagePath).toBeNull();
    expect(rows.inventory_public_media).toEqual([]);
  });
  it("retains a durable cleanup reference when upload and compensation fail", async () => {
    mocks.upload.mockRejectedValue(new Error("timeout"));
    mocks.remove.mockResolvedValue({ data: null, error: new Error("storage down") });
    await expect(
      clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId)
    ).rejects.toThrow();
    expect(rows.inventory_public_media[0]).toMatchObject({
      state: "pending",
      storagePath: mocks.upload.mock.calls[0][0],
    });
    expect(rows.inventory_items[0].paixaoClutchPublicImagePath).toBeNull();
  });
  it("replaces a public image and deletes the old public object", async () => {
    const first = await clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId);
    const second = await clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId);
    expect(second.publicPath).not.toBe(first.publicPath);
    expect(rows.inventory_public_media).toHaveLength(1);
    expect(mocks.remove).toHaveBeenCalledWith([first.storagePath]);
  });
  it("cleans up retryable public media after the item changes type", async () => {
    await clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId);
    rows.inventory_items[0].paixaoClutchPublished = true;
    mocks.remove.mockImplementationOnce(async () => {
      expect(rows.inventory_items[0]).toMatchObject({
        paixaoClutchPublished: false,
        paixaoClutchPublicImagePath: null,
      });
      return { error: new Error("storage down"), data: null };
    });
    await expect(clutch.removeInventoryPublicMedia({ itemId }, actorId)).rejects.toThrow();
    expect(rows.inventory_public_media[0].state).toBe("deleting");
    rows.inventory_items[0].type = "outfit";
    await clutch.removeInventoryPublicMedia({ itemId }, actorId);
    expect(rows.inventory_public_media).toEqual([]);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "inventory_public_media.removed" }),
      expect.anything()
    );
  });
  it("rejects manually supplied image references in the editorial form", () => {
    expect(
      updatePaixaoClutchSchema.safeParse({
        itemId,
        eligible: true,
        published: false,
        featured: false,
        publicImagePath: "/images/paixao-clutch/manual.jpg",
      }).success
    ).toBe(false);
  });
  it("rejects a file whose bytes do not match its declared image type", async () => {
    await expect(
      clutch.uploadInventoryPublicMedia(
        { itemId, file: new File(["<svg></svg>"], "spoof.jpg", { type: "image/jpeg" }) },
        actorId
      )
    ).rejects.toThrow(/imagem/i);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("validates copied private image size before creating public metadata", async () => {
    mocks.download.mockResolvedValue({
      data: new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "image/jpeg" }),
      error: null,
    });
    await expect(clutch.promoteInventoryMedia({ itemId, mediaId }, actorId)).rejects.toThrow();
    expect(rows.inventory_public_media).toEqual([]);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("keeps a published image intact when the removal-intent audit fails", async () => {
    const media = await clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId);
    rows.inventory_items[0].paixaoClutchPublished = true;
    mocks.audit.mockImplementation(async (event) => {
      if (event.action === "inventory_public_media.deletion_requested")
        throw new Error("audit down");
    });
    await expect(clutch.removeInventoryPublicMedia({ itemId }, actorId)).rejects.toThrow();
    expect(rows.inventory_items[0]).toMatchObject({
      paixaoClutchPublished: true,
      paixaoClutchPublicImagePath: media.publicPath,
    });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not delete ready media after an ambiguous successful commit", async () => {
    mocks.transaction.mockImplementationOnce(async (operation) => operation(database()));
    mocks.transaction.mockImplementationOnce(async (operation) => {
      await operation(database());
      throw new Error("commit acknowledgement lost");
    });
    await expect(
      clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId)
    ).rejects.toThrow();
    expect(rows.inventory_public_media[0].state).toBe("ready");
    expect(rows.inventory_items[0].paixaoClutchPublicImagePath).toBe(
      rows.inventory_public_media[0].publicPath
    );
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("returns only the public preview fields to an authorized reader", async () => {
    const media = await clutch.uploadInventoryPublicMedia({ itemId, file: jpeg() }, actorId);
    mocks.select.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: async () => [{ role: "admin" }] }) }),
    });
    mocks.select.mockImplementationOnce(database().select);
    await expect(clutch.readInventoryPublicMedia(itemId, actorId)).resolves.toEqual({
      id: media.id,
      publicPath: media.publicPath,
    });
    role = "client";
    await expect(clutch.readInventoryPublicMedia(itemId, actorId)).rejects.toThrow(
      /não autorizado/i
    );
  });
});
