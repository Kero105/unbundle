import { describe, expect, it } from "vitest";
import {
  checkFinancialAssistance,
  type FinancialAssistanceInput,
  type PovertyRow,
} from "./financial-assistance";

// Synthetic round numbers, not the real guidelines: size n line = n * $10,000.00.
const rows: PovertyRow[] = Array.from({ length: 8 }, (_, i) => ({
  guidelineYear: 2026,
  region: "contiguous" as const,
  householdSize: i + 1,
  povertyLineCents: (i + 1) * 1_000_000,
  perAdditionalPersonCents: 500_000,
}));

const base: FinancialAssistanceInput = {
  householdSize: 1,
  annualIncomeCents: 0,
  guidelineYear: 2026,
  region: "contiguous",
};
const check = (over: Partial<FinancialAssistanceInput>) =>
  checkFinancialAssistance({ ...base, ...over }, rows);

describe("checkFinancialAssistance", () => {
  it("is likely free care well under 200%", () => {
    expect(check({ annualIncomeCents: 500_000 })).toEqual({
      ok: true,
      percentOfFpl: 50,
      tier: "likely_free_care",
      explanationKey: "fpl.likely_free_care",
    });
  });

  it("is likely discount between 200% and 400%", () => {
    expect(check({ annualIncomeCents: 3_000_000 })).toMatchObject({
      ok: true,
      percentOfFpl: 300,
      tier: "likely_discount",
      explanationKey: "fpl.likely_discount",
    });
  });

  it("is likely not eligible above 400%", () => {
    expect(check({ annualIncomeCents: 5_000_000 })).toMatchObject({
      ok: true,
      percentOfFpl: 500,
      tier: "likely_not_eligible",
      explanationKey: "fpl.likely_not_eligible",
    });
  });

  it("puts exactly 200% in the lower tier", () => {
    expect(check({ annualIncomeCents: 2_000_000 })).toMatchObject({
      percentOfFpl: 200,
      tier: "likely_free_care",
    });
  });

  it("puts one cent over 200% in the discount tier even though it rounds to 200", () => {
    expect(check({ annualIncomeCents: 2_000_001 })).toMatchObject({
      percentOfFpl: 200,
      tier: "likely_discount",
    });
  });

  it("puts exactly 400% in the lower tier", () => {
    expect(check({ annualIncomeCents: 4_000_000 })).toMatchObject({
      percentOfFpl: 400,
      tier: "likely_discount",
    });
  });

  it("puts one cent over 400% in the top tier", () => {
    expect(check({ annualIncomeCents: 4_000_001 })).toMatchObject({
      percentOfFpl: 400,
      tier: "likely_not_eligible",
    });
  });

  it("uses the size-8 line plus the increment for households of 9 or more", () => {
    // size 9 line = 8_000_000 + 500_000 = 8_500_000
    expect(check({ householdSize: 9, annualIncomeCents: 17_000_000 })).toMatchObject({
      percentOfFpl: 200,
      tier: "likely_free_care",
    });
    // size 12 line = 8_000_000 + 4 * 500_000 = 10_000_000
    expect(check({ householdSize: 12, annualIncomeCents: 10_000_000 })).toMatchObject({
      percentOfFpl: 100,
    });
  });

  it("uses the size-8 row directly for a household of 8", () => {
    expect(check({ householdSize: 8, annualIncomeCents: 8_000_000 })).toMatchObject({
      percentOfFpl: 100,
    });
  });

  it("handles zero income", () => {
    expect(check({ annualIncomeCents: 0 })).toMatchObject({
      ok: true,
      percentOfFpl: 0,
      tier: "likely_free_care",
    });
  });

  it("rounds the percentage down", () => {
    // 150.999...% -> 150
    expect(check({ annualIncomeCents: 1_509_999 })).toMatchObject({ percentOfFpl: 150 });
  });

  it("rejects an invalid household size", () => {
    for (const householdSize of [0, -1, 1.5, Number.NaN]) {
      expect(check({ householdSize })).toEqual({ ok: false, error: "invalid_household_size" });
    }
  });

  it("rejects negative or fractional income", () => {
    expect(check({ annualIncomeCents: -1 })).toEqual({ ok: false, error: "invalid_income" });
    expect(check({ annualIncomeCents: 10.5 })).toEqual({ ok: false, error: "invalid_income" });
  });

  it("returns an error, not a throw, when the poverty row is missing", () => {
    expect(check({ guidelineYear: 1999 })).toEqual({ ok: false, error: "missing_poverty_row" });
    expect(check({ region: "AK" })).toEqual({ ok: false, error: "missing_poverty_row" });
    expect(checkFinancialAssistance(base, [])).toEqual({ ok: false, error: "missing_poverty_row" });
    // A household of 9+ also needs the size-8 row.
    expect(
      checkFinancialAssistance({ ...base, householdSize: 10 }, rows.slice(0, 7)),
    ).toEqual({ ok: false, error: "missing_poverty_row" });
  });
});
