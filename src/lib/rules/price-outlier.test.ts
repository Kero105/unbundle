import { describe, expect, it } from "vitest";
import { createInMemoryLookups } from "./in-memory-lookups";
import type { Gpci, MpfsRvu } from "./medicare-price";
import { priceOutlier } from "./price-outlier";
import { bill, line } from "./test-helpers";

// Synthetic RVUs: work 1.00 RVU, GPCI 1.000, CF 1.0000 price a line at exactly 100 cents.
const rvu = (overrides: Partial<MpfsRvu> = {}): MpfsRvu => ({
  statusCode: "A",
  workRvuX100: 100,
  nonfacilityPeRvuX100: 0,
  facilityPeRvuX100: 0,
  malpracticeRvuX100: 0,
  nonfacilityPeNa: false,
  facilityPeNa: false,
  conversionFactorX10000: 10000,
  ...overrides,
});
const gpci: Gpci = { workGpciNofloorX1000: 1000, peGpciX1000: 1000, mpGpciX1000: 1000 };
const MEDICARE = 100; // cents, from the values above

const priced = (o: Parameters<typeof line>[0] = {}) =>
  line({ id: "p1", code: "93000", units: 1, unitPriceCents: 1, chargeCents: 1, ...o });
const charge = (unitCents: number, units = 1, o: Parameters<typeof line>[0] = {}) =>
  priced({ unitPriceCents: unitCents, chargeCents: unitCents * units, units, ...o });
const run = (lines: ReturnType<typeof line>[], rates = [{ code: "93000", rvu: rvu() }]) =>
  priceOutlier(bill(lines), createInMemoryLookups({ rates, gpci }));

describe("priceOutlier", () => {
  it("fires above 5x with (unit charge - Medicare) * units at stake", async () => {
    const f = await run([charge(6 * MEDICARE)]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({
      ruleId: "price_outlier",
      lineItemIds: ["p1"],
      severity: "warning",
      confidence: "medium",
      amountAtStakeCents: 5 * MEDICARE,
    });
  });

  it("fires one cent above 5x", async () => {
    const f = await run([charge(5 * MEDICARE + 1)]);
    expect(f).toHaveLength(1);
    expect(f[0].amountAtStakeCents).toBe(4 * MEDICARE + 1);
  });

  it("does not fire at exactly 4x", async () => {
    expect(await run([charge(4 * MEDICARE)])).toEqual([]);
  });

  it("does not fire at exactly 5x", async () => {
    expect(await run([charge(5 * MEDICARE)])).toEqual([]);
  });

  it("multiplies the per-unit excess by units", async () => {
    const f = await run([charge(8 * MEDICARE, 3)]);
    expect(f).toHaveLength(1);
    expect(f[0].amountAtStakeCents).toBe(7 * MEDICARE * 3);
  });

  it("compares the unit charge, not the line total, to the threshold", async () => {
    // 3 units at 2x each: the line total is 6x one unit's price but each unit is only 2x.
    expect(await run([charge(2 * MEDICARE, 3)])).toEqual([]);
  });

  it("falls back to charge / units when there is no unit price", async () => {
    const f = await run([priced({ unitPriceCents: null, chargeCents: 1800, units: 3 })]);
    expect(f).toHaveLength(1);
    expect(f[0].amountAtStakeCents).toBe(1800 - 3 * MEDICARE);
  });

  it("skips a line whose code has no rate row", async () => {
    expect(await run([charge(100 * MEDICARE, 1, { code: "99999" })])).toEqual([]);
    expect(await run([charge(100 * MEDICARE)], [])).toEqual([]);
  });

  it("skips a line with a null Medicare price (status code not A, or PE is NA)", async () => {
    expect(await run([charge(100 * MEDICARE)], [{ code: "93000", rvu: rvu({ statusCode: "I" }) }])).toEqual([]);
    expect(await run([charge(100 * MEDICARE)], [{ code: "93000", rvu: rvu({ nonfacilityPeNa: true }) }])).toEqual([]);
  });

  it("skips a line with a Medicare price of 0", async () => {
    const zero = rvu({ workRvuX100: 0 });
    expect(await run([charge(100 * MEDICARE)], [{ code: "93000", rvu: zero }])).toEqual([]);
  });

  it("skips lines with no code or a non-CPT/HCPCS code type", async () => {
    const lines = [
      charge(100 * MEDICARE, 1, { id: "a", code: null, codeType: null }),
      charge(100 * MEDICARE, 1, { id: "b", codeType: "REVENUE" }),
      charge(100 * MEDICARE, 1, { id: "c", codeType: null }),
    ];
    expect(await run(lines)).toEqual([]);
  });

  it("prices HCPCS lines too", async () => {
    const f = await run([charge(6 * MEDICARE, 1, { code: "J1100", codeType: "HCPCS" })], [
      { code: "J1100", rvu: rvu() },
    ]);
    expect(f).toHaveLength(1);
  });

  it("uses the 26 / TC rate row when the line carries that modifier, with no fallback", async () => {
    const rates = [
      { code: "93000", rvu: rvu() },
      { code: "93000", modifier: "26", rvu: rvu({ workRvuX100: 50 }) },
    ];
    // 26 row prices at 50 cents: 300 is 6x, so it fires, where 6x of the base row would be 600.
    const f = await run([charge(300, 1, { modifiers: ["26"] })], rates);
    expect(f).toHaveLength(1);
    expect(f[0].amountAtStakeCents).toBe(250);
    // TC has no row: skipped rather than falling back to the unmodified price.
    expect(await run([charge(100 * MEDICARE, 1, { modifiers: ["TC"] })], rates)).toEqual([]);
    // Other modifiers price as the unmodified code.
    expect(await run([charge(6 * MEDICARE, 1, { modifiers: ["59"] })], rates)).toHaveLength(1);
  });

  it("returns one finding per outlier line and none for an empty bill", async () => {
    const f = await run([charge(6 * MEDICARE, 1, { id: "a" }), charge(2 * MEDICARE, 1, { id: "b" }), charge(9 * MEDICARE, 1, { id: "c" })]);
    expect(f.map((x) => x.lineItemIds[0])).toEqual(["a", "c"]);
    expect(await run([])).toEqual([]);
  });
});
