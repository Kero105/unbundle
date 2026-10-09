import { describe, expect, it } from "vitest";
import { dollarsToCents, formatCents } from "./money";

describe("dollarsToCents", () => {
  it("converts common values exactly", () => {
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents(0)).toBe(0);
    expect(dollarsToCents(5)).toBe(500);
    expect(dollarsToCents("5.5")).toBe(550);
  });

  it("avoids float errors", () => {
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
    expect(dollarsToCents(1.005)).toBe(101);
    expect(dollarsToCents(1.15)).toBe(115);
    expect(dollarsToCents(8.2 * 3)).toBe(2460);
  });

  it("rounds half away from zero at the cent", () => {
    expect(dollarsToCents("0.004")).toBe(0);
    expect(dollarsToCents("0.005")).toBe(1);
    expect(dollarsToCents("2.345")).toBe(235);
    expect(dollarsToCents("-2.345")).toBe(-235);
  });

  it("handles negatives", () => {
    expect(dollarsToCents(-19.99)).toBe(-1999);
    expect(dollarsToCents("-0.01")).toBe(-1);
    expect(dollarsToCents("-0.001")).toBe(0);
    expect(Object.is(dollarsToCents("-0.001"), -0)).toBe(false);
  });

  it("parses currency formatting in strings", () => {
    expect(dollarsToCents("$1,234.56")).toBe(123456);
    expect(dollarsToCents(" -$1,234.50 ")).toBe(-123450);
    expect(dollarsToCents(".5")).toBe(50);
    expect(dollarsToCents("7.")).toBe(700);
  });

  it("handles very large amounts", () => {
    expect(dollarsToCents("9999999999.99")).toBe(999999999999);
    expect(dollarsToCents(123456789012.34)).toBe(12345678901234);
    expect(() => dollarsToCents("1e30")).toThrow(RangeError);
    expect(() => dollarsToCents(1e30)).toThrow(RangeError);
    expect(() => dollarsToCents("99999999999999999999")).toThrow(RangeError);
  });

  it("rejects invalid input", () => {
    expect(() => dollarsToCents("")).toThrow(RangeError);
    expect(() => dollarsToCents("abc")).toThrow(RangeError);
    expect(() => dollarsToCents("1.2.3")).toThrow(RangeError);
    expect(() => dollarsToCents(NaN)).toThrow(RangeError);
    expect(() => dollarsToCents(Infinity)).toThrow(RangeError);
  });
});

describe("formatCents", () => {
  it("formats typical amounts", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(1)).toBe("$0.01");
    expect(formatCents(1999)).toBe("$19.99");
    expect(formatCents(100)).toBe("$1.00");
    expect(formatCents(123456)).toBe("$1,234.56");
  });

  it("formats negatives", () => {
    expect(formatCents(-1999)).toBe("-$19.99");
    expect(formatCents(-5)).toBe("-$0.05");
  });

  it("formats very large amounts", () => {
    expect(formatCents(999999999999)).toBe("$9,999,999,999.99");
    expect(formatCents(Number.MAX_SAFE_INTEGER)).toBe("$90,071,992,547,409.91");
  });

  it("rejects non-integer or unsafe input", () => {
    expect(() => formatCents(1.5)).toThrow(RangeError);
    expect(() => formatCents(NaN)).toThrow(RangeError);
    expect(() => formatCents(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });

  it("round-trips with dollarsToCents", () => {
    for (const c of [0, 1, 99, 1999, -1999, 123456789]) {
      expect(dollarsToCents(formatCents(c))).toBe(c);
    }
  });
});
