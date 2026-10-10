import { describe, expect, it } from "vitest";
import { EobLineSchema, type EobLine } from "@/lib/types";
import { deniedBilledInFull } from "./denied-billed-in-full";
import { bill, line } from "./test-helpers";

const eob = (o: Partial<EobLine> = {}) =>
  EobLineSchema.parse({
    id: "eob-1",
    dateOfService: "2026-10-02",
    code: "93000",
    billedCents: 5000,
    allowedCents: 0,
    planPaidCents: 0,
    patientResponsibilityCents: 0,
    denialReason: "CO-50: synthetic denial",
    ...o,
  });
const owed = (cents: number | null, o: Parameters<typeof line>[0] = {}) => line({ patientOwesCents: cents, ...o });
const run = (lines: ReturnType<typeof line>[], eobLines: EobLine[]) => deniedBilledInFull(bill(lines, { eobLines }));

describe("deniedBilledInFull", () => {
  it("fires when a denied EOB line's bill line still charges the patient", () => {
    const f = run([owed(5000)], [eob()]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({
      ruleId: "denied_billed_in_full",
      lineItemIds: ["li-1"],
      severity: "error",
      amountAtStakeCents: 5000,
    });
  });

  it("charges only what the bill line says the patient owes", () => {
    expect(run([owed(1234)], [eob()])[0].amountAtStakeCents).toBe(1234);
  });

  it("fires even when the EOB shows nonzero patient responsibility", () => {
    expect(run([owed(5000)], [eob({ patientResponsibilityCents: 5000 })])).toHaveLength(1);
  });

  it("does not fire when the denied line already charges the patient 0", () => {
    expect(run([owed(0)], [eob()])).toEqual([]);
  });

  it("does not fire when the patient amount is unknown or negative", () => {
    expect(run([owed(null)], [eob()])).toEqual([]);
    expect(run([owed(-100)], [eob()])).toEqual([]);
  });

  it("does not fire when the EOB line has no denial", () => {
    expect(run([owed(5000)], [eob({ denialReason: null })])).toEqual([]);
    expect(run([owed(5000)], [eob({ denialReason: "   " })])).toEqual([]);
  });

  it("does not match a different code or date", () => {
    expect(run([owed(5000, { code: "99213" })], [eob()])).toEqual([]);
    expect(run([owed(5000, { dateOfService: "2026-10-03" })], [eob()])).toEqual([]);
  });

  it("does not match when the EOB code or date is missing", () => {
    expect(run([owed(5000, { code: null, codeType: null })], [eob({ code: null })])).toEqual([]);
    expect(run([owed(5000, { dateOfService: null })], [eob({ dateOfService: null })])).toEqual([]);
  });

  it("flags only the matching line among several", () => {
    const f = run(
      [owed(600, { id: "a", code: "99214" }), owed(10500, { id: "b", code: "73030" })],
      [eob({ id: "e1", code: "99214", denialReason: null }), eob({ id: "e2", code: "73030" })],
    );
    expect(f.map((x) => x.lineItemIds[0])).toEqual(["b"]);
  });

  it("emits one finding when two denied EOB lines match the same bill line", () => {
    expect(run([owed(5000)], [eob({ id: "e1" }), eob({ id: "e2" })])).toHaveLength(1);
  });

  it("returns nothing with no EOB lines or no bill lines", () => {
    expect(run([owed(5000)], [])).toEqual([]);
    expect(run([], [eob()])).toEqual([]);
  });

  it("keeps the denial reason out of evidence", () => {
    const f = run([owed(5000)], [eob({ denialReason: "CO-50: SECRET REASON" })]);
    expect(f[0].evidence).not.toMatch(/SECRET/);
  });
});
