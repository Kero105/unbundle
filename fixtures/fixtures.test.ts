import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ExtractedBillSchema, RuleIdSchema } from "@/lib/types";

const root = path.join(__dirname);
const billFiles = fs.readdirSync(path.join(root, "bills")).filter((f) => f.endsWith(".json")).sort();
const readJson = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(root, ...p), "utf8"));

describe("synthetic bill fixtures", () => {
  it("has the expected number of bills", () => {
    expect(billFiles).toHaveLength(16);
  });

  it("has no expected file without a bill", () => {
    const expected = fs.readdirSync(path.join(root, "expected")).filter((f) => f.endsWith(".json")).sort();
    expect(expected).toEqual(billFiles);
  });

  describe.each(billFiles)("%s", (file) => {
    const bill = readJson("bills", file);

    it("parses with ExtractedBillSchema", () => {
      const r = ExtractedBillSchema.safeParse(bill);
      expect(r.success).toBe(true);
    });

    it("has 4 to 12 line items and a total matching the lines", () => {
      expect(bill.lineItems.length).toBeGreaterThanOrEqual(4);
      expect(bill.lineItems.length).toBeLessThanOrEqual(12);
      const sum = bill.lineItems.reduce((a: number, l: { chargeCents: number }) => a + l.chargeCents, 0);
      expect(bill.totalBilledCents).toBe(sum);
    });

    it("has a matching expected file that references real line items", () => {
      const exp = readJson("expected", file);
      expect(exp.bill).toBe(file);
      const ids = new Set(bill.lineItems.map((l: { id: string }) => l.id));
      for (const f of exp.expectedFindings) {
        expect(RuleIdSchema.safeParse(f.ruleId).success).toBe(true);
        expect(Number.isInteger(f.amountAtStakeCents)).toBe(true);
        expect(f.amountAtStakeCents).toBeGreaterThanOrEqual(0);
        for (const id of f.lineItemIds) expect(ids.has(id)).toBe(true);
      }
    });
  });

  it("rejects malformed modifiers", () => {
    const base = readJson("bills", billFiles[0]);
    for (const bad of ["5", "abc", "xs"]) {
      const b = structuredClone(base);
      b.lineItems[0].modifiers = [bad];
      expect(ExtractedBillSchema.safeParse(b).success).toBe(false);
    }
  });

  it("bill 5 carries no modifiers and bill 10 has 59 on 96372", () => {
    const b5 = readJson("bills", billFiles.find((f) => f.startsWith("bill-05"))!);
    expect(b5.lineItems.every((l: { modifiers?: string[] }) => !l.modifiers?.length)).toBe(true);
    expect(JSON.stringify(b5)).not.toMatch(/\b25\b/);
    const b10 = readJson("bills", billFiles.find((f) => f.startsWith("bill-10"))!);
    const inj = b10.lineItems.find((l: { code: string }) => l.code === "96372");
    expect(inj.modifiers).toEqual(["59"]);
  });
});
