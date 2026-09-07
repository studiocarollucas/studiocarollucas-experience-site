import { describe, expect, it } from "vitest";
import { createShootSchema, updateShootSchema } from "@/domain/shoots/schema";

const schemas = [
  {
    name: "createShootSchema",
    schema: createShootSchema,
    base: {
      clientId: "00000000-0000-4000-8000-000000000001",
      experiencePackageId: "00000000-0000-4000-8000-000000000002",
      shootDate: "2026-12-01",
      agreedPrice: "1200.00",
    },
  },
  { name: "updateShootSchema", schema: updateShootSchema, base: {} },
];

const fields = [
  { field: "locationName", max: 120 },
  { field: "locationAddress", max: 300 },
  { field: "clientGuidance", max: 2000 },
] as const;

describe.each(schemas)("$name client-safe fields", ({ schema, base }) => {
  describe.each(fields)("$field", ({ field, max }) => {
    it("trims surrounding whitespace and preserves the value", () => {
      const parsed = schema.parse({ ...base, [field]: " \nInformação da cliente\t " });
      expect(parsed).toHaveProperty(field, "Informação da cliente");
    });

    it("accepts omission without adding the field", () => {
      expect(schema.parse(base)).not.toHaveProperty(field);
    });

    it("accepts and preserves the maximum length", () => {
      const value = "a".repeat(max);
      expect(schema.parse({ ...base, [field]: value })).toHaveProperty(field, value);
    });

    it("rejects a value above the maximum length", () => {
      const result = schema.safeParse({ ...base, [field]: "a".repeat(max + 1) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(expect.arrayContaining([
          expect.objectContaining({ code: "too_big", path: [field] }),
        ]));
      }
    });
  });
});
