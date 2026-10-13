import { describe, expect, it } from "vitest";
import { parseManualCode } from "./manual-fields";

describe("parseManualCode", () => {
  it("treats blank as no code", () => {
    expect(parseManualCode("")).toEqual({ ok: true, value: null });
    expect(parseManualCode("   ")).toEqual({ ok: true, value: null });
  });

  it("trims and upper-cases", () => {
    expect(parseManualCode(" j3490 ")).toEqual({ ok: true, value: "J3490" });
    expect(parseManualCode("99213")).toEqual({ ok: true, value: "99213" });
  });

  it("accepts 3 to 10 characters and no more or fewer", () => {
    expect(parseManualCode("470").ok).toBe(true);
    expect(parseManualCode("0123456789").ok).toBe(true);
    expect(parseManualCode("47").ok).toBe(false);
    expect(parseManualCode("01234567890").ok).toBe(false);
  });

  it("rejects punctuation and spaces inside", () => {
    for (const text of ["99-213", "99 213", "99213!", "<script>"]) {
      expect(parseManualCode(text).ok).toBe(false);
    }
  });
});
