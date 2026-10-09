import { describe, expect, it } from "vitest";
import { dateMismatch } from "./date-mismatch";
import { bill, line } from "./test-helpers";

const range = { serviceStart: "2026-10-05", serviceEnd: "2026-10-06" };

describe("dateMismatch", () => {
  it("fires on a line after the range and charges the full line", () => {
    const f = dateMismatch(bill([line({ dateOfService: "2026-10-08", chargeCents: 10500, unitPriceCents: 10500 })], range));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ ruleId: "date_mismatch", lineItemIds: ["li-1"], amountAtStakeCents: 10500 });
  });

  it("fires on a line before the range", () => {
    expect(dateMismatch(bill([line({ dateOfService: "2026-10-04" })], range))).toHaveLength(1);
  });

  it("does not fire on the boundary dates (inclusive)", () => {
    const b = bill([line({ id: "a", dateOfService: "2026-10-05" }), line({ id: "b", dateOfService: "2026-10-06" })], range);
    expect(dateMismatch(b)).toEqual([]);
  });

  it("fires one day past either boundary", () => {
    const b = bill([line({ id: "a", dateOfService: "2026-10-04" }), line({ id: "b", dateOfService: "2026-10-07" })], range);
    expect(dateMismatch(b).map((f) => f.lineItemIds[0])).toEqual(["a", "b"]);
  });

  it("handles month and year boundaries", () => {
    const r = { serviceStart: "2026-12-31", serviceEnd: "2027-01-01" };
    expect(dateMismatch(bill([line({ id: "a", dateOfService: "2027-01-01" }), line({ id: "b", dateOfService: "2026-12-31" })], r))).toEqual([]);
    expect(dateMismatch(bill([line({ dateOfService: "2027-01-02" })], r))).toHaveLength(1);
  });

  it("checks only the bound that exists", () => {
    const onlyEnd = { serviceStart: null, serviceEnd: "2026-10-06" };
    expect(dateMismatch(bill([line({ dateOfService: "2020-01-01" })], onlyEnd))).toEqual([]);
    expect(dateMismatch(bill([line({ dateOfService: "2026-10-07" })], onlyEnd))).toHaveLength(1);
    const onlyStart = { serviceStart: "2026-10-05", serviceEnd: null };
    expect(dateMismatch(bill([line({ dateOfService: "2030-01-01" })], onlyStart))).toEqual([]);
    expect(dateMismatch(bill([line({ dateOfService: "2026-10-04" })], onlyStart))).toHaveLength(1);
  });

  it("checks nothing when the range is absent", () => {
    const none = { serviceStart: null, serviceEnd: null };
    expect(dateMismatch(bill([line({ dateOfService: "1999-01-01" })], none))).toEqual([]);
  });

  it("skips lines with no date", () => {
    expect(dateMismatch(bill([line({ dateOfService: null })], range))).toEqual([]);
  });

  it("skips an inverted range", () => {
    const inverted = { serviceStart: "2026-10-06", serviceEnd: "2026-10-05" };
    expect(dateMismatch(bill([line({ dateOfService: "2026-10-05" })], inverted))).toEqual([]);
  });

  it("never reports a negative amount", () => {
    const f = dateMismatch(bill([line({ dateOfService: "2026-10-09", unitPriceCents: -500, chargeCents: -500 })], range));
    expect(f[0].amountAtStakeCents).toBe(0);
  });

  it("returns nothing for an empty bill", () => {
    expect(dateMismatch(bill([], range))).toEqual([]);
  });
});
