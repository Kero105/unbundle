import { describe, expect, it } from "vitest";
import { EobLineSchema, type EobLine } from "@/lib/types";
import { balanceBilling } from "./balance-billing";
import { bill, line } from "./test-helpers";

const eob = (o: Partial<EobLine> = {}) =>
  EobLineSchema.parse({
    id: "eob-1",
    dateOfService: "2026-10-02",
    code: "93000",
    billedCents: 5000,
    allowedCents: 3000,
    planPaidCents: 2400,
    patientResponsibilityCents: 600,
    denialReason: null,
    ...o,
  });
const owed = (cents: number | null, o: Parameters<typeof line>[0] = {}) => line({ patientOwesCents: cents, ...o });
const run = (lines: ReturnType<typeof line>[], eobLines: EobLine[]) => balanceBilling(bill(lines, { eobLines }));

describe("balanceBilling", () => {
  it("fires when the bill charges more than the EOB patient responsibility", () => {
    const f = run([owed(2600)], [eob()]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({
      id: "balance_billing:li-1",
      ruleId: "balance_billing",
      lineItemIds: ["li-1"],
      severity: "warning",
      confidence: "medium",
      amountAtStakeCents: 2000,
      citation: "balance_billing.patient_charged_above_eob_responsibility",
    });
    expect(f[0].evidence).toBe(
      "eob_line=eob-1;code=93000;date=2026-10-02;patient_owes_cents=2600;eob_patient_responsibility_cents=600;difference_cents=2000",
    );
  });

  it("does not fire when the amounts match", () => {
    expect(run([owed(600)], [eob()])).toEqual([]);
  });

  it("does not fire when the bill charges less than the EOB", () => {
    expect(run([owed(100)], [eob()])).toEqual([]);
    expect(run([owed(0)], [eob()])).toEqual([]);
  });

  it("fires for a $0 EOB responsibility when the bill still charges something", () => {
    const f = run([owed(1)], [eob({ patientResponsibilityCents: 0 })]);
    expect(f[0].amountAtStakeCents).toBe(1);
  });

  it("does not fire when either patient amount is unknown", () => {
    expect(run([owed(null)], [eob()])).toEqual([]);
    expect(run([owed(2600)], [eob({ patientResponsibilityCents: null })])).toEqual([]);
  });

  it("leaves denied EOB lines to the denied_billed_in_full rule", () => {
    expect(run([owed(5000)], [eob({ denialReason: "CO-50" })])).toEqual([]);
  });

  it("does not match a different code or date, or a missing code or date", () => {
    expect(run([owed(2600, { code: "99213" })], [eob()])).toEqual([]);
    expect(run([owed(2600, { dateOfService: "2026-10-03" })], [eob()])).toEqual([]);
    expect(run([owed(2600, { code: null, codeType: null })], [eob({ code: null })])).toEqual([]);
    expect(run([owed(2600, { dateOfService: null })], [eob({ dateOfService: null })])).toEqual([]);
  });

  it("skips ambiguous matches instead of guessing", () => {
    expect(run([owed(2600, { id: "a" }), owed(2600, { id: "b" })], [eob()])).toEqual([]);
    expect(run([owed(2600)], [eob({ id: "e1" }), eob({ id: "e2" })])).toEqual([]);
  });

  it("returns nothing for an empty bill or no EOB", () => {
    expect(run([], [])).toEqual([]);
    expect(run([owed(2600)], [])).toEqual([]);
  });

  it("flags only the mismatching line among several", () => {
    const f = run(
      [
        owed(600, { id: "a", code: "93000" }),
        owed(11440, { id: "b", code: "99214", chargeCents: 22000 }),
      ],
      [
        eob({ id: "e1", code: "93000" }),
        eob({ id: "e2", code: "99214", patientResponsibilityCents: 2640 }),
      ],
    );
    expect(f.map((x) => [x.lineItemIds[0], x.amountAtStakeCents])).toEqual([["b", 8800]]);
  });
});
