import { describe, it, expect } from "vitest";
import { toCents, fromCents, addDecimal, sumCents } from "@/lib/money";

describe("toCents", () => {
  it("converts a whole-real decimal string", () => {
    expect(toCents("1200.00")).toBe(120000);
  });
  it("pads a single-digit fraction to cents", () => {
    expect(toCents("1234.5")).toBe(123450);
  });
  it("handles a value with no fraction part", () => {
    expect(toCents("42")).toBe(4200);
  });
  it("handles large thousands-free values without separators", () => {
    expect(toCents("1234567.89")).toBe(123456789);
  });
  it("converts zero", () => {
    expect(toCents("0.00")).toBe(0);
  });
  it("keeps the sign on a negative value", () => {
    expect(toCents("-200.00")).toBe(-20000);
  });
  it("keeps the sign on a negative value with cents", () => {
    expect(toCents("-200.50")).toBe(-20050);
  });
});

describe("fromCents", () => {
  it("converts whole cents back to a 2-decimal string", () => {
    expect(fromCents(120000)).toBe("1200.00");
  });
  it("pads the fraction to two digits", () => {
    expect(fromCents(50)).toBe("0.50");
  });
  it("converts zero", () => {
    expect(fromCents(0)).toBe("0.00");
  });
  it("preserves the sign on a negative amount", () => {
    expect(fromCents(-20000)).toBe("-200.00");
  });
  it("preserves the sign on a negative amount with cents", () => {
    expect(fromCents(-20050)).toBe("-200.50");
  });
});

describe("round-trip fromCents(toCents(x)) === x", () => {
  for (const value of [
    "0.00",
    "1200.00",
    "1234.50",
    "799.50",
    "1234567.89",
    "-200.00",
    "-200.50",
    "0.05",
  ]) {
    it(`round-trips ${value}`, () => {
      expect(fromCents(toCents(value))).toBe(value);
    });
  }
});

describe("addDecimal", () => {
  it("adds two positive decimal strings without float drift", () => {
    expect(addDecimal("0.10", "0.20")).toBe("0.30");
  });
  it("adds a negative decimal string (subtraction)", () => {
    expect(addDecimal("1000.00", "-200.50")).toBe("799.50");
  });
});

describe("sumCents", () => {
  it("is zero for an empty list", () => {
    expect(sumCents([])).toBe(0);
  });
  it("sums a list of decimal strings in cents with no drift", () => {
    expect(sumCents(["1.00", "2.50", "10.99"])).toBe(1449);
  });
  it("sums a list that mixes positive and negative amounts", () => {
    expect(sumCents(["1000.00", "-200.50"])).toBe(79950);
  });
});
