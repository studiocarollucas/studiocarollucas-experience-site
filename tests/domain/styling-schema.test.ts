import { describe, expect, it } from "vitest";
import {
  createStylingReferenceSchema,
  validateStylingFile,
} from "@/domain/styling/schema";

const SHOOT_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";

describe("styling reference schema", () => {
  it("accepts a client reference", () => {
    expect(
      createStylingReferenceSchema.parse({
        shootId: SHOOT_ID,
        storagePath: `${USER_ID}/${SHOOT_ID}/ref.webp`,
        caption: "Movimento e tons claros",
        origin: "client",
        uploadedByAuthUserId: USER_ID,
      }),
    ).toMatchObject({ origin: "client" });
  });

  it("limits captions to 500 characters", () => {
    expect(() =>
      createStylingReferenceSchema.parse({
        shootId: SHOOT_ID,
        storagePath: `${USER_ID}/${SHOOT_ID}/ref.webp`,
        caption: "x".repeat(501),
        origin: "client",
        uploadedByAuthUserId: USER_ID,
      }),
    ).toThrow();
  });

  it.each([
    ["sem nome do objeto", `${USER_ID}/${SHOOT_ID}`],
    ["com segmento vazio", `${USER_ID}//ref.webp`],
    ["com segmento extra", `${USER_ID}/${SHOOT_ID}/pasta/ref.webp`],
    ["com object-key ponto", `${USER_ID}/${SHOOT_ID}/.`],
    ["com object-key de diretório pai", `${USER_ID}/${SHOOT_ID}/..`],
  ])("rejects a non-canonical storage path %s", (_label, storagePath) => {
    expect(
      createStylingReferenceSchema.safeParse({
        shootId: SHOOT_ID,
        storagePath,
        caption: "Referência",
        origin: "client",
        uploadedByAuthUserId: USER_ID,
      }).success,
    ).toBe(false);
  });

  it("accepts only JPEG, PNG, or WebP up to 8 MB", () => {
    expect(validateStylingFile({ type: "image/webp", size: 8 * 1024 * 1024 })).toBeNull();
    expect(validateStylingFile({ type: "image/gif", size: 100 })).toMatch(/JPG, PNG ou WebP/);
    expect(
      validateStylingFile({ type: "image/jpeg", size: 8 * 1024 * 1024 + 1 }),
    ).toMatch(/8 MB/);
  });
});
