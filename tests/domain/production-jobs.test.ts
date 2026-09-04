import { describe, it, expect } from "vitest";
import { createProductionJobSchema } from "@/domain/production/schema";

describe("createProductionJobSchema", () => {
  const validBase = {
    shootId: "00000000-0000-4000-8000-000000000001",
  };

  it("accepts a minimal valid job", () => {
    expect(createProductionJobSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to aguardando", () => {
    expect(createProductionJobSchema.parse(validBase).status).toBe("aguardando");
  });

  it("rejects a missing shootId", () => {
    expect(createProductionJobSchema.safeParse({}).success).toBe(false);
  });
});
