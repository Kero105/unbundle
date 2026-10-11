import { describe, expect, it } from "vitest";
import { codeKind, parseBillingCode, parseModelExplanation, sanitizeDescription } from "./validate";

describe("parseBillingCode", () => {
  it("accepts CPT, HCPCS, revenue and DRG shapes and normalizes case", () => {
    expect(parseBillingCode("99213")).toBe("99213");
    expect(parseBillingCode(" j1100 ")).toBe("J1100");
    expect(parseBillingCode("0450")).toBe("0450");
    expect(parseBillingCode("470")).toBe("470");
    expect(parseBillingCode("0042T")).toBe("0042T");
  });

  it("rejects anything else", () => {
    for (const bad of ["", "12", "123456", "ABCDE", "99213 x", "99213\nx", "99-213", 5, null, undefined]) {
      expect(() => parseBillingCode(bad)).toThrow("invalid_code");
    }
  });
});

describe("codeKind", () => {
  it("classifies by shape", () => {
    expect(codeKind("99213")).toBe("cpt");
    expect(codeKind("0042T")).toBe("cpt");
    expect(codeKind("J1100")).toBe("hcpcs");
    expect(codeKind("0450")).toBe("revenue");
    expect(codeKind("470")).toBe("drg");
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
