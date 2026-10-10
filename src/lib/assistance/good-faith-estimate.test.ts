import { describe, expect, it } from "vitest";
import { checkGoodFaithEstimate, type GoodFaithEstimateInput } from "./good-faith-estimate";

const base: GoodFaithEstimateInput = {
  estimateTotalCents: 100_000,
  billedTotalCents: 140_000,
  estimateDate: "2026-01-10",
  billDate: "2026-03-01",
  today: "2026-03-01",
};
const check = (over: Partial<GoodFaithEstimateInput>) =>
  checkGoodFaithEstimate({ ...base, ...over });

// 2026-03-01 + n days
const todayPlus = (n: number) =>
  new Date(Date.UTC(2026, 2, 1 + n)).toISOString().slice(0, 10);

describe("checkGoodFaithEstimate", () => {
  it("is over the threshold at exactly $400", () => {
    expect(check({ billedTotalCents: 140_000 })).toEqual({
      ok: true,
      differenceCents: 40_000,
      overThreshold: true,
      withinDisputeWindow: true,
      explanationKey: "gfe.over_threshold_in_window",
    });
  });

  it("is under the threshold at $399.99", () => {
    expect(check({ billedTotalCents: 139_999 })).toEqual({
      ok: true,
      differenceCents: 39_999,
      overThreshold: false,
      withinDisputeWindow: true,
      explanationKey: "gfe.under_threshold",
    });
  });

  it("reports a negative difference when billed is below the estimate", () => {
    expect(check({ billedTotalCents: 90_000 })).toMatchObject({
      ok: true,
      differenceCents: -10_000,
      overThreshold: false,
    });
  });

  it("handles zero amounts", () => {
    expect(check({ estimateTotalCents: 0, billedTotalCents: 0 })).toMatchObject({
      ok: true,
      differenceCents: 0,
      overThreshold: false,
    });
  });

  it("is within the window on day 119 and 120, and closed on day 121", () => {
    expect(check({ today: todayPlus(119) })).toMatchObject({ withinDisputeWindow: true });
    expect(check({ today: todayPlus(120) })).toMatchObject({ withinDisputeWindow: true });
    expect(check({ today: todayPlus(121) })).toMatchObject({
      withinDisputeWindow: false,
      explanationKey: "gfe.over_threshold_window_closed",
    });
  });

  it("does not depend on the clock when today is given", () => {
    expect(check({ today: "2026-03-01" })).toEqual(check({ today: "2026-03-01" }));
  });

  it("rejects invalid dates", () => {
    for (const over of [
      { billDate: "2026-02-30" },
      { billDate: "03/01/2026" },
      { billDate: "" },
      { estimateDate: "not a date" },
      { today: "2026-13-01" },
      { estimateDate: "2026-04-01" }, // estimate after the bill
      { today: "2026-02-28" }, // before the bill
    ]) {
      expect(check(over)).toEqual({ ok: false, error: "invalid_dates" });
    }
  });

  it("rejects invalid amounts", () => {
    for (const over of [
      { billedTotalCents: -1 },
      { estimateTotalCents: -1 },
      { billedTotalCents: 10.5 },
      { estimateTotalCents: Number.NaN },
    ]) {
      expect(check(over)).toEqual({ ok: false, error: "invalid_amount" });
    }
  });
});
