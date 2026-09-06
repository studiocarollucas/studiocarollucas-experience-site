import { describe, it, expect } from "vitest";
import { formatBRL, formatShootDate, formatDateInput } from "@/lib/format";

describe("formatBRL", () => {
  it("formats a whole-real decimal string", () => {
    expect(formatBRL("1200.00")).toBe("R$ 1.200,00");
  });
  it("formats cents and thousands separators", () => {
    expect(formatBRL("1234.5")).toBe("R$ 1.234,50");
  });
  it("formats zero", () => {
    expect(formatBRL("0.00")).toBe("R$ 0,00");
  });
  it("formats a negative balance (overpayment) without dropping the sign", () => {
    expect(formatBRL("-200.00")).toBe("-R$ 200,00");
  });
});

describe("formatShootDate", () => {
  it("renders a Postgres date string as day-month-year, pt-BR, no timezone shift", () => {
    expect(formatShootDate("2026-10-18")).toBe("18 out 2026");
  });
});

describe("formatDateInput", () => {
  it("passes an ISO date straight through for <input type=date>", () => {
    expect(formatDateInput("2026-10-18")).toBe("2026-10-18");
  });
  it("trims a full ISO datetime down to the date part", () => {
    expect(formatDateInput("2026-10-18T14:30:00.000Z")).toBe("2026-10-18");
  });
});
