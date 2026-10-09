import { describe, expect, it } from "vitest";
import { mathError } from "./math-error";
import { bill, line } from "./test-helpers";

describe("mathError", () => {
  it("fires when charge exceeds units x price", () => {
    const f = mathError(bill([line({ units: 3, unitPriceCents: 8000, chargeCents: 32000 })]));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ ruleId: "math_error", lineItemIds: ["li-1"], amountAtStakeCents: 8000 });
  });

  it("does not fire when the math is right", () => {
    expect(mathError(bill([line({ units: 3, unitPriceCents: 8000, chargeCents: 24000 })]))).toEqual([]);
  });

  it("fires on a one-cent overage", () => {
    const f = mathError(bill([line({ chargeCents: 5001 })]));
    expect(f[0].amountAtStakeCents).toBe(1);
  });

  it("does not flag undercharges", () => {
    expect(mathError(bill([line({ chargeCents: 4999 })]))).toEqual([]);
  });

  it("skips lines with no unit price", () => {
    expect(mathError(bill([line({ unitPriceCents: null, chargeCents: 99999 })]))).toEqual([]);
  });

  it("flags a positive charge on a zero unit price", () => {
    const f = mathError(bill([line({ unitPriceCents: 0, chargeCents: 100 })]));
    expect(f[0].amountAtStakeCents).toBe(100);
  });

  it("treats zero units as expecting zero charge (schema forbids it, rule stays safe)", () => {
    const withZeroUnits = (chargeCents: number) => ({
      ...bill([line()]),
      lineItems: [{ ...line({ chargeCents }), units: 0 }],
    });
    expect(mathError(withZeroUnits(500))[0].amountAtStakeCents).toBe(500);
    expect(mathError(withZeroUnits(0))).toEqual([]);
  });

  it("does not flag negative amounts (credits)", () => {
    expect(mathError(bill([line({ unitPriceCents: -5000, chargeCents: -5000 })]))).toEqual([]);
    expect(mathError(bill([line({ chargeCents: -5000 })]))).toEqual([]);
  });

  it("returns nothing for an empty bill", () => {
    expect(mathError(bill([]))).toEqual([]);
  });
});
