import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runRules } from "@/lib/rules";
import { ExtractedBillSchema, FindingSchema } from "@/lib/types";
import { EobLineSchema } from "@/lib/types/eob-line";
import { LineItemSchema } from "@/lib/types/line-item";
import { getDemoBill, getDemoFindings, getDemoPovertyGuidelines } from "./data";
import { createReplayLookups, DemoReferenceSchema } from "./reference-snapshot";

const dir = path.resolve(__dirname, "../../../fixtures/review");
const readText = (name: string) => fs.readFileSync(path.join(dir, name), "utf8");
const readJson = (name: string) => JSON.parse(readText(name));

describe("demo bill", () => {
  it("loads from the bundled fixture and parses", () => {
    const bill = getDemoBill();
    expect(ExtractedBillSchema.safeParse(readJson("demo-bill.json")).success).toBe(true);
    expect(bill.lineItems.length).toBeGreaterThan(0);
    expect(bill.lineItems.reduce((sum, li) => sum + li.chargeCents, 0)).toBe(bill.totalBilledCents);
  });

  it("is labelled synthetic", () => {
    expect(getDemoBill().providerName.toLowerCase()).toContain("synthetic");
  });

  it("has only the extracted-bill fields, with no personal-data fields", () => {
    const bill = readJson("demo-bill.json");
    const billKeys = new Set(Object.keys(ExtractedBillSchema.shape));
    for (const key of Object.keys(bill)) expect(billKeys.has(key), key).toBe(true);

    const allKeys = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          allKeys.add(k);
          walk(v);
        }
      }
    };
    walk(bill);
    // Every key must be a schema field (or a source-box coordinate), so an
    // added patient name, DOB, member ID or address field fails here.
    const allowed = new Set([
      ...Object.keys(ExtractedBillSchema.shape),
      ...Object.keys(LineItemSchema.shape),
      ...Object.keys(EobLineSchema.shape),
      "x",
      "y",
      "width",
      "height",
    ]);
    expect([...allKeys].filter((k) => !allowed.has(k))).toEqual([]);
  });

  it("contains no values that look like personal identifiers", () => {
    const text = readText("demo-bill.json");
    expect(text).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/); // SSN
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // email
    expect(text).not.toMatch(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/); // phone
    expect(text).not.toMatch(/\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|blvd|drive|dr)\b/i); // address
  });
});

describe("demo findings", () => {
  const reference = DemoReferenceSchema.parse(readJson("demo-reference.json"));

  it("parse as findings", () => {
    for (const f of readJson("demo-findings.json")) {
      expect(FindingSchema.safeParse(f).success).toBe(true);
    }
  });

  it("match running the rules on the demo bill against the recorded reference rows", async () => {
    const computed = await runRules(getDemoBill(), createReplayLookups(reference.rules));
    expect(getDemoFindings()).toEqual(computed);
  });

  it("only reference line items on the demo bill", () => {
    const ids = new Set(getDemoBill().lineItems.map((li) => li.id));
    for (const f of getDemoFindings()) {
      for (const id of f.lineItemIds) expect(ids.has(id), id).toBe(true);
    }
  });
});

describe("demo poverty guidelines", () => {
  it("load as a complete set for one year", () => {
    const g = getDemoPovertyGuidelines();
    expect(g.rows.map((r) => r.householdSize).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const row of g.rows) {
      expect(row.guidelineYear).toBe(g.guidelineYear);
      expect(row.region).toBe("contiguous");
    }
  });
});
