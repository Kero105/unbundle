import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ExtractedBillSchema, FindingSchema } from "@/lib/types";
import { createInMemoryLookups } from "./in-memory-lookups";
import type { Mue, PtpEdit } from "./lookups";
import { runRules, type Rule } from "./index";
import { bill, line } from "./test-helpers";

const fixtures = path.join(__dirname, "../../../fixtures");
const readJson = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(fixtures, ...p), "utf8"));

const names = [
  "bill-01-duplicate-charge",
  "bill-02-math-error",
  "bill-03-date-outside-range",
  "bill-08-vague-charge",
  "bill-13-clean-office-visit",
  "bill-14-clean-pt-multiday",
];

const ptp = (column1Code: string, column2Code: string, modifierIndicator: 0 | 1): PtpEdit => ({
  column1Code,
  column2Code,
  effectiveDate: "2000-01-01",
  deletionDate: null,
  modifierIndicator,
  rationale: "synthetic",
});

// Fixtures that need the exact PTP pair seeded.
const ptpFixtures: [string, PtpEdit][] = [
  ["bill-04-ncci-unbundling", ptp("80053", "80048", 0)],
  ["bill-05-ncci-indicator1-no-modifier", ptp("20610", "99214", 1)],
  ["bill-10-trap-ptp-modifier-59", ptp("96365", "96372", 1)],
];

const mue = (code: string, mueValue: number): Mue => ({
  code,
  mueValue,
  adjudicationIndicator: 3,
  adjudicationText: "Date of Service Edit: Clinical",
  rationale: "synthetic",
});

const mueFixtures: [string, Mue][] = [
  ["bill-06-mue-exceeded", mue("97140", 6)],
  ["bill-11-trap-mue-at-limit", mue("97110", 6)],
];

const summarize = (fs: { ruleId: string; lineItemIds: string[]; amountAtStakeCents: number }[]) =>
  fs
    .map((f) => ({ ruleId: f.ruleId, lineItemIds: [...f.lineItemIds].sort(), amountAtStakeCents: f.amountAtStakeCents }))
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId) || a.lineItemIds.join().localeCompare(b.lineItemIds.join()));

describe("runRules", () => {
  it("returns no findings for an empty bill", async () => {
    expect(await runRules(bill([]), createInMemoryLookups())).toEqual([]);
  });

  it("runs every registered rule and returns schema-valid findings", async () => {
    const b = bill(
      [
        line({ id: "a" }),
        line({ id: "b" }),
        line({ id: "c", code: "97110", units: 3, unitPriceCents: 8000, chargeCents: 32000 }),
        line({ id: "d", code: "73030", dateOfService: "2026-10-09" }),
      ],
      { serviceStart: "2026-10-02", serviceEnd: "2026-10-02" },
    );
    const findings = await runRules(b, createInMemoryLookups());
    expect(findings.map((f) => f.ruleId).sort()).toEqual(["date_mismatch", "duplicate_charge", "math_error"]);
    for (const f of findings) expect(FindingSchema.safeParse(f).success).toBe(true);
  });

  it("passes lookups to each rule", async () => {
    const lookups = createInMemoryLookups();
    const seen: unknown[] = [];
    const spy: Rule = (_bill, l) => {
      seen.push(l);
      return [];
    };
    await runRules(bill([line()]), lookups, [spy, spy]);
    expect(seen).toEqual([lookups, lookups]);
  });

  it("accepts a custom rule list", async () => {
    expect(await runRules(bill([line()]), createInMemoryLookups(), [])).toEqual([]);
  });

  describe.each(names)("fixture %s", (name) => {
    it("matches the expected findings", async () => {
      const b = ExtractedBillSchema.parse(readJson("bills", `${name}.json`));
      const expected = readJson("expected", `${name}.json`);
      expect(summarize(await runRules(b, createInMemoryLookups()))).toEqual(summarize(expected.expectedFindings));
    });
  });

  describe.each(ptpFixtures)("fixture %s", (name, edit) => {
    it("matches the expected findings", async () => {
      const b = ExtractedBillSchema.parse(readJson("bills", `${name}.json`));
      const expected = readJson("expected", `${name}.json`);
      const found = await runRules(b, createInMemoryLookups({ ptpEdits: [edit] }));
      expect(summarize(found)).toEqual(summarize(expected.expectedFindings));
      // summarize sorts ids; column order matters for this rule, so check it unsorted.
      expect(found.map((f) => f.lineItemIds)).toEqual(
        expected.expectedFindings.map((f: { lineItemIds: string[] }) => f.lineItemIds),
      );
      for (const f of found) expect(FindingSchema.safeParse(f).success).toBe(true);
    });
  });

  describe.each(mueFixtures)("fixture %s", (name, m) => {
    it("matches the expected findings", async () => {
      const b = ExtractedBillSchema.parse(readJson("bills", `${name}.json`));
      const expected = readJson("expected", `${name}.json`);
      const found = await runRules(b, createInMemoryLookups({ mues: [m] }));
      expect(summarize(found)).toEqual(summarize(expected.expectedFindings));
      for (const f of found) expect(FindingSchema.safeParse(f).success).toBe(true);
    });
  });
});
