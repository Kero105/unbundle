import { describe, expect, it } from "vitest";
import { EobLineSchema, type EobLine } from "@/lib/types";
import { bill, line } from "@/lib/rules/test-helpers";
import { buildEobReconciliation, hasReconciliationMismatch } from "./eob-reconciliation";

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

describe("buildEobReconciliation", () => {
  it("is empty without an EOB", () => {
    expect(buildEobReconciliation(bill([line()]))).toEqual([]);
  });

  it("pairs by date and code and reports matching amounts", () => {
    const rows = buildEobReconciliation(bill([line({ patientOwesCents: 600 })], { eobLines: [eob()] }));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: "match",
      billChargeCents: 5000,
      eobBilledCents: 5000,
      allowedCents: 3000,
      planPaidCents: 2400,
      eobPatientResponsibilityCents: 600,
      billPatientOwesCents: 600,
      differenceCents: 0,
      lineItemId: "li-1",
    });
  });

  it("marks a bill that charges more than the EOB, and one that charges less", () => {
    const higher = buildEobReconciliation(bill([line({ patientOwesCents: 2600 })], { eobLines: [eob()] }));
    expect(higher[0]).toMatchObject({ status: "billHigher", differenceCents: 2000 });
    const lower = buildEobReconciliation(bill([line({ patientOwesCents: 100 })], { eobLines: [eob()] }));
    expect(lower[0]).toMatchObject({ status: "billLower", differenceCents: -500 });
    expect(hasReconciliationMismatch(higher)).toBe(true);
    expect(hasReconciliationMismatch(lower)).toBe(true);
  });

  it("marks denied lines and unknown amounts without a difference", () => {
    const denied = buildEobReconciliation(
      bill([line({ patientOwesCents: 5000 })], { eobLines: [eob({ denialReason: "CO-50" })] }),
    );
    expect(denied[0].status).toBe("denied");
    const unknown = buildEobReconciliation(bill([line({ patientOwesCents: null })], { eobLines: [eob()] }));
    expect(unknown[0]).toMatchObject({ status: "unknown", differenceCents: null });
    expect(hasReconciliationMismatch([...denied, ...unknown])).toBe(false);
  });

  it("lists bill lines missing from the EOB and EOB lines missing from the bill", () => {
    const rows = buildEobReconciliation(
      bill([line({ id: "a", code: "99214" })], { eobLines: [eob({ id: "e", code: "36415" })] }),
    );
    expect(rows.map((r) => r.status)).toEqual(["notOnEob", "notOnBill"]);
    expect(rows[1].lineItemId).toBeNull();
  });

  it("pairs repeated date and code lines one to one in order", () => {
    const rows = buildEobReconciliation(
      bill(
        [line({ id: "a", patientOwesCents: 600 }), line({ id: "b", patientOwesCents: 600 })],
        { eobLines: [eob({ id: "e1" })] },
      ),
    );
    expect(rows.map((r) => r.status)).toEqual(["match", "notOnEob"]);
  });

  it("never pairs lines that have no date or no code", () => {
    const rows = buildEobReconciliation(
      bill([line({ code: null, codeType: null })], { eobLines: [eob({ code: null })] }),
    );
    expect(rows.map((r) => r.status)).toEqual(["notOnEob", "notOnBill"]);
  });
});
