import { describe, expect, it } from "vitest";
import { duplicateCharge } from "./duplicate-charge";
import { bill, line } from "./test-helpers";

describe("duplicateCharge", () => {
  it("fires on identical lines and charges one copy", () => {
    const f = duplicateCharge(bill([line({ id: "a" }), line({ id: "b" })]));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ ruleId: "duplicate_charge", lineItemIds: ["a", "b"], amountAtStakeCents: 5000 });
  });

  it("charges n-1 copies for three identical lines", () => {
    const f = duplicateCharge(bill([line({ id: "a" }), line({ id: "b" }), line({ id: "c" })]));
    expect(f).toHaveLength(1);
    expect(f[0].amountAtStakeCents).toBe(10000);
  });

  it("does not fire on a single line", () => {
    expect(duplicateCharge(bill([line()]))).toEqual([]);
  });

  it("does not fire for the same code on different dates", () => {
    const b = bill([line({ id: "a" }), line({ id: "b", dateOfService: "2026-10-03" })]);
    expect(duplicateCharge(b)).toEqual([]);
  });

  it("does not fire when units, price or modifiers differ", () => {
    expect(duplicateCharge(bill([line({ id: "a" }), line({ id: "b", units: 2, chargeCents: 10000 })]))).toEqual([]);
    expect(duplicateCharge(bill([line({ id: "a" }), line({ id: "b", unitPriceCents: 4000, chargeCents: 4000 })]))).toEqual([]);
    expect(duplicateCharge(bill([line({ id: "a", modifiers: ["LT"] }), line({ id: "b", modifiers: ["RT"] })]))).toEqual([]);
  });

  it("treats modifier order as irrelevant", () => {
    const b = bill([line({ id: "a", modifiers: ["59", "LT"] }), line({ id: "b", modifiers: ["LT", "59"] })]);
    expect(duplicateCharge(b)).toHaveLength(1);
  });

  it("ignores lines with a null code or null date", () => {
    expect(duplicateCharge(bill([line({ id: "a", code: null }), line({ id: "b", code: null })]))).toEqual([]);
    expect(duplicateCharge(bill([line({ id: "a", dateOfService: null }), line({ id: "b", dateOfService: null })]))).toEqual([]);
  });

  it("ignores zero and negative charges", () => {
    const zero = { unitPriceCents: 0, chargeCents: 0 };
    const neg = { unitPriceCents: -5000, chargeCents: -5000 };
    expect(duplicateCharge(bill([line({ id: "a", ...zero }), line({ id: "b", ...zero })]))).toEqual([]);
    expect(duplicateCharge(bill([line({ id: "a", ...neg }), line({ id: "b", ...neg })]))).toEqual([]);
  });

  it("returns nothing for an empty bill", () => {
    expect(duplicateCharge(bill([]))).toEqual([]);
  });
});
