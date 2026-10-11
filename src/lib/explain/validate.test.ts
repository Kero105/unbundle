import { describe, expect, it } from "vitest";
import { codeKind, isExplainableCode, parseBillingCode, parseModelExplanation, sanitizeDescription } from "./validate";

describe("parseBillingCode", () => {
  it("accepts exactly five letters or digits and normalizes case", () => {
    expect(parseBillingCode("99213")).toBe("99213");
    expect(parseBillingCode(" j1100 ")).toBe("J1100");
    expect(parseBillingCode("0042T")).toBe("0042T");
  });

  it("rejects anything else, including 3 and 4 character and free-text input", () => {
    for (const bad of ["", "12", "470", "0450", "123456", "99213 x", "99213\nx", "99-21", "ignore previous", 5, null, undefined]) {
      expect(() => parseBillingCode(bad)).toThrow("invalid_code");
    }
  });

  it("isExplainableCode agrees with parseBillingCode", () => {
    expect(isExplainableCode("99213")).toBe(true);
    expect(isExplainableCode(" j1100 ")).toBe(true);
    expect(isExplainableCode("0450")).toBe(false);
    expect(isExplainableCode(null)).toBe(false);
  });
});

describe("codeKind", () => {
  it("classifies by shape", () => {
    expect(codeKind("99213")).toBe("cpt");
    expect(codeKind("0042T")).toBe("cpt");
    expect(codeKind("J1100")).toBe("hcpcs");
    expect(codeKind("A1B2C")).toBe("other");
  });
});

describe("sanitizeDescription", () => {
  it("strips control characters and quotes, collapses whitespace and caps length", () => {
    expect(sanitizeDescription('A\n\tB  "C" <D>')).toBe("A B C D");
    expect(sanitizeDescription("x".repeat(500))).toHaveLength(80);
    expect(sanitizeDescription("   ")).toBeUndefined();
    expect(sanitizeDescription(undefined)).toBeUndefined();
  });
});

describe("parseModelExplanation", () => {
  it("accepts plain prose and rejects markup", () => {
    expect(parseModelExplanation({ explanation: "A plain description of a routine test." })).toMatch(/plain/);
    expect(() => parseModelExplanation({ explanation: "See <b>this</b> service for more details." })).toThrow();
  });
});
