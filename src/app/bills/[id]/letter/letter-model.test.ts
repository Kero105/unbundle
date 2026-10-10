import { describe, expect, it } from "vitest";
import { FindingSchema, type Finding } from "@/lib/types";
import { bill, line } from "@/lib/rules/test-helpers";
import { buildLetterModel } from "./letter-model";

function finding(overrides: Partial<Finding> & { id: string }): Finding {
  return FindingSchema.parse({
    ruleId: "duplicate_charge",
    lineItemIds: ["li-1"],
    severity: "warning",
    confidence: "high",
    amountAtStakeCents: 1000,
    evidence: "",
    citation: "duplicate_charge.same_code_date_units_price",
    ...overrides,
  });
}

const b = bill([
  line({ id: "li-1", code: "93000", descriptionRaw: "ECG", chargeCents: 5000 }),
  line({ id: "li-2", code: null, descriptionRaw: "MISC SUPPLIES", dateOfService: null, chargeCents: 9000 }),
]);

describe("buildLetterModel", () => {
  it("returns no items when there are no findings", () => {
    expect(buildLetterModel(b, [])).toEqual({ items: [] });
  });

  it("makes exactly one item per finding, none dropped or added", () => {
    const fs = [finding({ id: "a" }), finding({ id: "b", lineItemIds: ["li-2"] })];
    const { items } = buildLetterModel(b, fs);
    expect(items.map((i) => i.findingId).sort()).toEqual(["a", "b"]);
  });

  it("orders by amount in question, largest first, and numbers from 1", () => {
    const { items } = buildLetterModel(b, [
      finding({ id: "small", amountAtStakeCents: 100 }),
      finding({ id: "big", amountAtStakeCents: 8000 }),
      finding({ id: "mid", amountAtStakeCents: 2500 }),
    ]);
    expect(items.map((i) => [i.number, i.findingId])).toEqual([
      [1, "big"],
      [2, "mid"],
      [3, "small"],
    ]);
  });

  it("keeps rule order for equal amounts", () => {
    const { items } = buildLetterModel(b, [
      finding({ id: "first", amountAtStakeCents: 500 }),
      finding({ id: "second", amountAtStakeCents: 500 }),
    ]);
    expect(items.map((i) => i.findingId)).toEqual(["first", "second"]);
  });

  it("passes the finding's amount through unchanged, including zero", () => {
    const { items } = buildLetterModel(b, [
      finding({ id: "a", amountAtStakeCents: 4321 }),
      finding({ id: "z", amountAtStakeCents: 0 }),
    ]);
    expect(items.map((i) => i.amountInQuestionCents)).toEqual([4321, 0]);
  });

  it("uses firm wording for high confidence and soft for medium and low", () => {
    const { items } = buildLetterModel(b, [
      finding({ id: "h", confidence: "high", amountAtStakeCents: 3 }),
      finding({ id: "m", confidence: "medium", amountAtStakeCents: 2 }),
      finding({ id: "l", confidence: "low", amountAtStakeCents: 1 }),
    ]);
    expect(items.map((i) => i.tone)).toEqual(["firm", "soft", "soft"]);
  });

  it("maps the citation to a reason, falling back for unknown citations", () => {
    const { items } = buildLetterModel(b, [
      finding({ id: "known", amountAtStakeCents: 2 }),
      finding({ id: "odd", citation: "something.new", amountAtStakeCents: 1 }),
    ]);
    expect(items.map((i) => i.reason)).toEqual(["duplicateCharge", "fallback"]);
  });

  it("resolves line details from the bill, in finding order", () => {
    const { items } = buildLetterModel(b, [finding({ id: "a", lineItemIds: ["li-2", "li-1"] })]);
    expect(items[0].lines).toEqual([
      { code: null, description: "MISC SUPPLIES", dateOfService: null, chargeCents: 9000 },
      { code: "93000", description: "ECG", dateOfService: "2026-10-02", chargeCents: 5000 },
    ]);
  });

  it("skips line item ids that are not on the bill", () => {
    const { items } = buildLetterModel(b, [finding({ id: "a", lineItemIds: ["nope", "li-1"] })]);
    expect(items[0].lines.map((l) => l.code)).toEqual(["93000"]);
  });

  it("does not mutate the findings it is given", () => {
    const fs = [finding({ id: "a", amountAtStakeCents: 1 }), finding({ id: "b", amountAtStakeCents: 9 })];
    buildLetterModel(b, fs);
    expect(fs.map((f) => f.id)).toEqual(["a", "b"]);
  });
});
