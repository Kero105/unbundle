import { describe, expect, it } from "vitest";
import { VAGUE_CHARGE_THRESHOLD_CENTS, vagueCharge } from "./vague-charge";
import { bill, line } from "./test-helpers";

const uncoded = (o: Parameters<typeof line>[0] = {}) =>
  line({ id: "u1", code: null, codeType: null, descriptionRaw: "ITEM", unitPriceCents: 2500, chargeCents: 2500, ...o });
const run = (l: ReturnType<typeof line>) => vagueCharge(bill([l]));

describe("vagueCharge", () => {
  it("fires on an uncoded line with a generic term and charges the full line", () => {
    const f = run(uncoded({ descriptionRaw: "MISC SERVICES", chargeCents: 18500, unitPriceCents: 18500 }));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ ruleId: "vague_charge", lineItemIds: ["u1"], amountAtStakeCents: 18500 });
  });

  it.each(["misc", "Miscellaneous", "OTHER", "supplies", "Services", "PHARMACY", "general"])(
    "fires on the generic term %s",
    (term) => {
      expect(run(uncoded({ descriptionRaw: `${term} charge` }))).toHaveLength(1);
    },
  );

  it("fires on a low-dollar uncoded line with a generic term", () => {
    expect(run(uncoded({ descriptionRaw: "GENERAL SUPPLIES", chargeCents: 500, unitPriceCents: 500 }))).toHaveLength(1);
  });

  it("fires on an uncoded line over the threshold with a specific description", () => {
    const over = VAGUE_CHARGE_THRESHOLD_CENTS + 1;
    const f = run(uncoded({ descriptionRaw: "CAST APPLICATION", chargeCents: over, unitPriceCents: over }));
    expect(f).toHaveLength(1);
    expect(f[0].amountAtStakeCents).toBe(over);
  });

  it("does not fire on an uncoded line exactly at the threshold with a specific description", () => {
    const at = VAGUE_CHARGE_THRESHOLD_CENTS;
    expect(run(uncoded({ descriptionRaw: "CAST APPLICATION", chargeCents: at, unitPriceCents: at }))).toEqual([]);
  });

  it("does not fire on a coded line with a generic word in its description", () => {
    expect(run(line({ code: "99213", descriptionRaw: "OFFICE VISIT GENERAL MISC SERVICES OTHER" }))).toEqual([]);
  });

  it("does not fire on a coded line over the threshold", () => {
    const big = VAGUE_CHARGE_THRESHOLD_CENTS * 10;
    expect(run(line({ code: "99213", chargeCents: big, unitPriceCents: big }))).toEqual([]);
  });

  it("treats a blank code as uncoded", () => {
    expect(run(uncoded({ code: "  ", descriptionRaw: "MISC" }))).toHaveLength(1);
  });

  it("matches whole words only", () => {
    expect(run(uncoded({ descriptionRaw: "OTHERWISE MISCELLANY SERVICED" }))).toEqual([]);
  });

  it("does not fire on an uncoded line with a specific description under the threshold", () => {
    expect(run(uncoded({ descriptionRaw: "ELASTIC BANDAGE" }))).toEqual([]);
  });

  it("skips uncoded generic lines with a zero or negative charge", () => {
    expect(run(uncoded({ descriptionRaw: "MISC", chargeCents: 0, unitPriceCents: 0 }))).toEqual([]);
    expect(run(uncoded({ descriptionRaw: "MISC", chargeCents: -500, unitPriceCents: -500 }))).toEqual([]);
  });

  it("returns nothing for an empty bill", () => {
    expect(vagueCharge(bill([]))).toEqual([]);
  });

  it("emits one finding per vague line and keeps the description out of evidence", () => {
    const f = vagueCharge(
      bill([uncoded({ id: "a", descriptionRaw: "MISC SECRET NAME" }), line({ id: "b" }), uncoded({ id: "c", descriptionRaw: "OTHER" })]),
    );
    expect(f.map((x) => x.lineItemIds[0])).toEqual(["a", "c"]);
    expect(f[0].evidence).toBe("term=misc;charge_cents=2500");
    expect(f[0].evidence).not.toMatch(/SECRET/i);
  });
});
