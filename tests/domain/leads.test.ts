import { describe, it, expect } from "vitest";
import { createLeadSchema } from "@/domain/leads/schema";

describe("createLeadSchema", () => {
  it("accepts a lead with just a source", () => {
    const result = createLeadSchema.safeParse({ source: "Instagram" });
    expect(result.success).toBe(true);
  });

  it("defaults status to novo", () => {
    const result = createLeadSchema.parse({ source: "Instagram" });
    expect(result.status).toBe("novo");
  });

  it("rejects a missing source", () => {
    const result = createLeadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status value", () => {
    const result = createLeadSchema.safeParse({ source: "Instagram", status: "not-a-real-status" });
    expect(result.success).toBe(false);
  });
});
