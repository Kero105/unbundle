import { describe, expect, it } from "vitest";
import { createInMemoryLookups } from "./in-memory-lookups";
import type { PtpEdit } from "./lookups";
import { ncciUnbundling } from "./ncci-unbundling";
import { bill, line } from "./test-helpers";

const edit = (overrides: Partial<PtpEdit> = {}): PtpEdit => ({
  column1Code: "80053",
  column2Code: "80048",
  effectiveDate: "2020-01-01",
  deletionDate: null,
  modifierIndicator: 0,
  rationale: "synthetic",
  ...overrides,
});

const col1 = (o = {}) => line({ id: "c1", code: "80053", chargeCents: 5200, unitPriceCents: 5200, ...o });
const col2 = (o = {}) => line({ id: "c2", code: "80048", chargeCents: 3800, unitPriceCents: 3800, ...o });
const run = (lines: ReturnType<typeof line>[], edits: PtpEdit[]) =>
  ncciUnbundling(bill(lines), createInMemoryLookups({ ptpEdits: edits }));

describe("ncciUnbundling", () => {
  it("indicator 0 fires with high confidence, even with modifier 59", async () => {
    for (const modifiers of [[], ["59"]]) {
      const f = await run([col1(), col2({ modifiers })], [edit()]);
      expect(f).toHaveLength(1);
      expect(f[0]).toMatchObject({
        ruleId: "ncci_unbundling",
        lineItemIds: ["c1", "c2"],
        confidence: "high",
        amountAtStakeCents: 3800,
      });
    }
  });

  it("indicator 1 fires with medium confidence when column 2 has no bypass modifier", async () => {
    const f = await run([col1(), col2()], [edit({ modifierIndicator: 1 })]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ confidence: "medium", amountAtStakeCents: 3800 });
  });

  it("indicator 1 does not fire when column 2 has 59, XE, XP, XS or XU", async () => {
    for (const m of ["59", "XE", "XP", "XS", "XU"]) {
      expect(await run([col1(), col2({ modifiers: [m] })], [edit({ modifierIndicator: 1 })])).toEqual([]);
    }
  });

  it("indicator 1 still fires with a non-bypass modifier or a bypass modifier only on column 1", async () => {
    const e = [edit({ modifierIndicator: 1 })];
    expect(await run([col1(), col2({ modifiers: ["25"] })], e)).toHaveLength(1);
    expect(await run([col1({ modifiers: ["59"] }), col2()], e)).toHaveLength(1);
  });

  describe("modifier 25 on an E/M column 2 line", () => {
    const e1 = [edit({ column2Code: "99213", modifierIndicator: 1 })];
    const em = (o = {}) => col2({ code: "99213", ...o });

    it("does not fire when the E/M line has modifier 25", async () => {
      expect(await run([col1(), em({ modifiers: ["25"] })], e1)).toEqual([]);
    });

    it("still fires when the E/M line has no modifier 25", async () => {
      expect(await run([col1(), em()], e1)).toHaveLength(1);
    });

    it("still fires for a non-E/M line with modifier 25", async () => {
      expect(await run([col1(), col2({ modifiers: ["25"] })], [edit({ modifierIndicator: 1 })])).toHaveLength(1);
    });

    it("still fires for indicator 0 regardless of 25", async () => {
      const e0 = [edit({ column2Code: "99213", modifierIndicator: 0 })];
      expect(await run([col1(), em({ modifiers: ["25"] })], e0)).toHaveLength(1);
    });

    it("applies the E/M range boundaries 99202 and 99499 inclusively", async () => {
      for (const [code, fires] of [["99201", true], ["99202", false], ["99499", false], ["99500", true]] as const) {
        const e = [edit({ column2Code: code, modifierIndicator: 1 })];
        const f = await run([col1(), col2({ code, modifiers: ["25"] })], e);
        expect(f.length > 0).toBe(fires);
      }
    });

    it("ignores modifier 25 on column 1 and in the description", async () => {
      expect(await run([col1({ modifiers: ["25"] }), em()], e1)).toHaveLength(1);
      expect(await run([col1(), em({ descriptionRaw: "SYNTHETIC -25" })], e1)).toHaveLength(1);
    });
  });

  it("reads modifiers only from the modifiers field, not the description", async () => {
    const f = await run([col1(), col2({ descriptionRaw: "SYNTHETIC -59 XS" })], [edit({ modifierIndicator: 1 })]);
    expect(f).toHaveLength(1);
  });

  it("ignores a deleted edit", async () => {
    expect(await run([col1(), col2()], [edit({ deletionDate: "2026-09-30" })])).toEqual([]);
  });

  it("ignores an edit not yet effective", async () => {
    expect(await run([col1(), col2()], [edit({ effectiveDate: "2026-10-03" })])).toEqual([]);
  });

  it("fires when the deletion date is exactly the service date", async () => {
    expect(await run([col1(), col2()], [edit({ deletionDate: "2026-10-02" })])).toHaveLength(1);
  });

  it("does not fire for lines on different dates", async () => {
    expect(await run([col1(), col2({ dateOfService: "2026-10-03" })], [edit()])).toEqual([]);
  });

  it("orders ids [column1, column2] when the column 2 line appears first", async () => {
    const f = await run([col2(), col1()], [edit()]);
    expect(f).toHaveLength(1);
    expect(f[0].lineItemIds).toEqual(["c1", "c2"]);
    expect(f[0].amountAtStakeCents).toBe(3800);
  });

  it("returns nothing when there are no edits, no lines, or one line", async () => {
    expect(await run([col1(), col2()], [])).toEqual([]);
    expect(await run([], [edit()])).toEqual([]);
    expect(await run([col1()], [edit()])).toEqual([]);
  });

  it("skips lines with a null code or date, and clamps negative charges to zero", async () => {
    expect(await run([col1(), col2({ code: null })], [edit()])).toEqual([]);
    expect(await run([col1(), col2({ dateOfService: null })], [edit()])).toEqual([]);
    const f = await run([col1(), col2({ chargeCents: -3800, unitPriceCents: -3800 })], [edit()]);
    expect(f[0].amountAtStakeCents).toBe(0);
  });
});
