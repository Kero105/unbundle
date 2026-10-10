import { describe, expect, it } from "vitest";
import { gfeDateProblem } from "./gfe-date-problem";

const TODAY = "2026-06-15";

describe("gfeDateProblem", () => {
  it("returns null for a valid pair", () => {
    expect(gfeDateProblem("2026-01-10", "2026-02-01", TODAY)).toBeNull();
  });

  it("allows the same day and a bill dated today", () => {
    expect(gfeDateProblem("2026-06-15", "2026-06-15", TODAY)).toBeNull();
  });

  it("flags an estimate dated after the bill", () => {
    expect(gfeDateProblem("2026-03-01", "2026-02-01", TODAY)).toBe("estimate_after_bill");
  });

  it("flags a bill dated in the future", () => {
    expect(gfeDateProblem("2026-06-01", "2026-06-16", TODAY)).toBe("bill_in_future");
  });

  it("reports an estimate after the bill before a future bill", () => {
    expect(gfeDateProblem("2026-07-02", "2026-07-01", TODAY)).toBe("estimate_after_bill");
  });

  it("flags empty or invalid dates as missing", () => {
    expect(gfeDateProblem("", "2026-02-01", TODAY)).toBe("missing");
    expect(gfeDateProblem("2026-01-10", "", TODAY)).toBe("missing");
    expect(gfeDateProblem("", "", TODAY)).toBe("missing");
    expect(gfeDateProblem("2026-02-30", "2026-03-01", TODAY)).toBe("missing");
  });
});
