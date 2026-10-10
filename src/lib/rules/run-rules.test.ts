import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ExtractedBillSchema, FindingSchema } from "@/lib/types";
import { createInMemoryLookups } from "./in-memory-lookups";
import { runRules, type Rule } from "./index";
import { bill, line } from "./test-helpers";

const fixtures = path.join(__dirname, "../../../fixtures");
const readJson = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(fixtures, ...p), "utf8"));

const names = [
  "bill-01-duplicate-charge",
  "bill-02-math-error",
  "bill-03-date-outside-range",
  "bill-13-clean-office-visit",
  "bill-14-clean-pt-multiday",
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
});
