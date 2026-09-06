import { describe, it, expect } from "vitest";
import { clientFormSchema } from "@/domain/clients/form-schema";

describe("clientFormSchema", () => {
  it("accepts a name-only submission", () => {
    const r = clientFormSchema.safeParse({ name: "Maria Silva" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.marketingConsent).toBe(false);
  });

  it("coerces a checkbox boolean already normalized by toFormAction", () => {
    const r = clientFormSchema.safeParse({ name: "Maria", marketingConsent: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.marketingConsent).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(clientFormSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(clientFormSchema.safeParse({ name: "Maria", email: "nope" }).success).toBe(false);
  });

  it("rejects a malformed birthday", () => {
    expect(clientFormSchema.safeParse({ name: "Maria", birthday: "12/03/1994" }).success).toBe(false);
  });

  it("rejects a referrerClientId that is not a uuid", () => {
    expect(clientFormSchema.safeParse({ name: "Maria", referrerClientId: "x" }).success).toBe(false);
  });
});
