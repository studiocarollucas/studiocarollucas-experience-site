// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@/db/client", () => ({ db: { select: mocks.select } }));

import { findPublicPaixaoClutch, listPublicPaixaoClutches } from "@/domain/inventory/public-clutch";

const publicImagePath = "https://project.supabase.co/storage/v1/object/public/paixao-clutch-media/paixao-clutch/dourada.webp";
const row = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "clutch-dourada-cl-001",
  name: "Clutch dourada",
  copy: "Um brilho discreto.",
  rentalPrice: "120.00",
  publicImagePath,
  featured: true,
  sortOrder: 0,
};

function result(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(rows),
          limit: vi.fn().mockResolvedValue(rows),
        }),
      }),
    }),
  };
}

describe("public Paixão Clutch projection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.select.mockReturnValue(result([row]));
  });

  it("returns precisely the safe published projection, without private fields", async () => {
    await expect(listPublicPaixaoClutches()).resolves.toEqual([row]);
    const [item] = await listPublicPaixaoClutches();
    expect(item).not.toHaveProperty("replacementValue");
    expect(item).not.toHaveProperty("storagePath");
  });

  it("requires every public publication invariant, including ready matching media", async () => {
    await listPublicPaixaoClutches();
    const predicate = new PgDialect().sqlToQuery(
      mocks.select.mock.results[0].value.from.mock.results[0].value.innerJoin.mock.results[0].value.where.mock.calls[0][0],
    );
    expect(predicate.sql).toContain('"inventory_items"."type"');
    expect(predicate.params).toEqual(expect.arrayContaining(["clutch", true, "available", "ready"]));
    expect(predicate.sql).toContain('"inventory_public_media"."public_path" = "inventory_items"."paixao_clutch_public_image_path"');
  });

  it.each([
    ["non-clutch", '"inventory_items"."type" = $1'],
    ["inactive", '"inventory_items"."active" = $2'],
    ["maintenance", '"inventory_items"."status" = $3'],
    ["ineligible", '"inventory_items"."paixao_clutch_eligible" = $4'],
    ["unpublished", '"inventory_items"."paixao_clutch_published" = $5'],
    ["missing slug", '"inventory_items"."paixao_clutch_slug" is not null'],
    ["missing price", '"inventory_items"."rental_price" is not null'],
    ["missing copy", '"inventory_items"."paixao_clutch_copy" is not null'],
    ["missing image", '"inventory_items"."paixao_clutch_public_image_path" is not null'],
    ["non-ready public media", '"inventory_public_media"."state" = $6'],
    ["mismatched public media", '"inventory_public_media"."public_path" = "inventory_items"."paixao_clutch_public_image_path"'],
  ])("excludes a %s row", async (_, expectedClause) => {
    await listPublicPaixaoClutches();
    const predicate = new PgDialect().sqlToQuery(
      mocks.select.mock.results[0].value.from.mock.results[0].value.innerJoin.mock.results[0].value.where.mock.calls[0][0],
    );
    expect(predicate.sql).toContain(expectedClause);
  });

  it("orders featured rows first, then editorial order and Portuguese name", async () => {
    await listPublicPaixaoClutches();
    const orderBy = mocks.select.mock.results[0].value.from.mock.results[0].value.innerJoin.mock.results[0].value.where.mock.results[0].value.orderBy;
    expect(orderBy).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything());
  });

  it("returns null when no public clutch matches the requested slug", async () => {
    mocks.select.mockReturnValueOnce(result([]));
    await expect(findPublicPaixaoClutch("absent")).resolves.toBeNull();
  });

  it("adds the requested slug to the public predicate for detail reads", async () => {
    await findPublicPaixaoClutch(row.slug);
    const predicate = new PgDialect().sqlToQuery(
      mocks.select.mock.results[0].value.from.mock.results[0].value.innerJoin.mock.results[0].value.where.mock.calls[0][0],
    );
    expect(predicate.sql).toContain('"inventory_items"."paixao_clutch_slug" = $7');
    expect(predicate.params.at(-1)).toBe(row.slug);
  });
});
