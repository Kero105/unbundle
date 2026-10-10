import { describe, expect, it } from "vitest";
import {
  parseDate,
  parseModifiers,
  parseMoney,
  parseOptionalMoney,
  parseOptionalText,
  parseRequiredText,
  parseUnits,
} from "./fields";

describe("parseDate", () => {
  it("accepts ISO dates and empty", () => {
    expect(parseDate("2026-09-12")).toEqual({ ok: true, value: "2026-09-12" });
    expect(parseDate("  ")).toEqual({ ok: true, value: null });
  });
  it("rejects impossible or non-ISO dates", () => {
    expect(parseDate("2026-02-30").ok).toBe(false);
    expect(parseDate("09/12/2026").ok).toBe(false);
  });
});

describe("parseUnits", () => {
  it("accepts whole numbers >= 1", () => {
    expect(parseUnits("1")).toEqual({ ok: true, value: 1 });
    expect(parseUnits(" 12 ")).toEqual({ ok: true, value: 12 });
  });
  it("rejects zero, negatives, decimals, empty, junk", () => {
    for (const bad of ["0", "-1", "1.5", "", "abc", "1e3", "99999999999999999999"]) {
      expect(parseUnits(bad).ok, bad).toBe(false);
    }
  });
});

describe("parseMoney", () => {
  it("parses to integer cents", () => {
    expect(parseMoney("125.00")).toEqual({ ok: true, value: 12500 });
    expect(parseMoney("$1,234.50")).toEqual({ ok: true, value: 123450 });
    expect(parseMoney("0")).toEqual({ ok: true, value: 0 });
    expect(parseMoney("-12.34")).toEqual({ ok: true, value: -1234 });
  });
  it("rejects empty and non-numeric", () => {
    for (const bad of ["", "  ", "abc", "1.2.3", "$"]) {
      expect(parseMoney(bad).ok, bad).toBe(false);
    }
  });
});

describe("parseOptionalMoney", () => {
  it("treats empty as null", () => {
    expect(parseOptionalMoney("")).toEqual({ ok: true, value: null });
    expect(parseOptionalMoney("4.50")).toEqual({ ok: true, value: 450 });
    expect(parseOptionalMoney("x").ok).toBe(false);
  });
});

describe("parseModifiers", () => {
  it("splits on commas and spaces, uppercases, dedupes", () => {
    expect(parseModifiers("59, 25")).toEqual({ ok: true, value: ["59", "25"] });
    expect(parseModifiers("xs lt xs")).toEqual({ ok: true, value: ["XS", "LT"] });
  });
  it("allows none", () => {
    expect(parseModifiers("")).toEqual({ ok: true, value: [] });
  });
  it("rejects wrong-length or non-alphanumeric modifiers", () => {
    for (const bad of ["5", "590", "5-", "ABC"]) {
      expect(parseModifiers(bad).ok, bad).toBe(false);
    }
  });
});

describe("text parsers", () => {
  it("optional text trims and nulls empty", () => {
    expect(parseOptionalText("  99213 ")).toEqual({ ok: true, value: "99213" });
    expect(parseOptionalText("  ")).toEqual({ ok: true, value: null });
  });
  it("required text rejects empty", () => {
    expect(parseRequiredText("  ").ok).toBe(false);
    expect(parseRequiredText(" x ")).toEqual({ ok: true, value: "x" });
  });
});
