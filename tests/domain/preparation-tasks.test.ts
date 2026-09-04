import { describe, it, expect } from "vitest";
import { createPreparationTaskSchema } from "@/domain/preparation/schema";

describe("createPreparationTaskSchema", () => {
  const validBase = {
    shootId: "00000000-0000-4000-8000-000000000001",
    type: "moodboard",
    title: "Enviar moodboard de referência",
  };

  it("accepts a minimal valid task", () => {
    expect(createPreparationTaskSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to pendente and visibleToClient to true", () => {
    const parsed = createPreparationTaskSchema.parse(validBase);
    expect(parsed.status).toBe("pendente");
    expect(parsed.visibleToClient).toBe(true);
  });

  it("rejects a missing title", () => {
    const { title, ...rest } = validBase;
    expect(createPreparationTaskSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a missing shootId", () => {
    const { shootId, ...rest } = validBase;
    expect(createPreparationTaskSchema.safeParse(rest).success).toBe(false);
  });
});
