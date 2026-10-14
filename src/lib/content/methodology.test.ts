import { describe, expect, it } from "vitest";
import accuracy from "@/lib/accuracy/accuracy.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { rules } from "@/lib/rules";
import { PRICE_OUTLIER_MULTIPLE } from "@/lib/rules/price-outlier";
import { VAGUE_CHARGE_THRESHOLD_CENTS, VAGUE_TERMS } from "@/lib/rules/vague-charge";
import { RULE_IDS } from "./rule-ids";

const both = [
  ["en", en],
  ["es", es],
] as const;

describe("methodology", () => {
  it("lists exactly the registered rules, matching the accuracy report ids", () => {
    expect(RULE_IDS).toHaveLength(rules.length);
    expect([...RULE_IDS].sort()).toEqual(accuracy.rules.map((r) => r.ruleId).sort());
  });

  it.each(both)("has every field for every rule in %s", (_, messages) => {
    for (const id of RULE_IDS) {
      const rule = messages.Methodology.rules[id];
      for (const field of ["name", "what", "skips", "confidence", "example"] as const) {
        expect(rule[field].length, `${id}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("states the thresholds the code uses", () => {
    expect(PRICE_OUTLIER_MULTIPLE).toBe(5);
    expect(en.Methodology.rules.price_outlier.what).toContain("5 times");
    expect(es.Methodology.rules.price_outlier.what).toContain("5 veces");
    const dollars = `$${(VAGUE_CHARGE_THRESHOLD_CENTS / 100).toFixed(2)}`;
    expect(en.Methodology.rules.vague_charge.what).toContain(dollars);
    expect(es.Methodology.rules.vague_charge.what).toContain(dollars);
    for (const term of VAGUE_TERMS) {
      expect(en.Methodology.rules.vague_charge.what).toContain(term);
    }
  });
});

describe("how the AI's role is described", () => {
  it("matches About: reads the bill into data; fixed rules decide; no explaining of findings", () => {
    expect(en.Methodology.intro).toMatch(/only reads your bill into structured data/);
    expect(en.Methodology.intro).toMatch(/fixed, tested rules decide every finding/);
    expect(es.Methodology.intro).toMatch(/solo lee su factura/);
    expect(es.Methodology.intro).toMatch(/reglas fijas y probadas deciden cada hallazgo/);
  });

  it("never says the AI explains each finding, anywhere in the messages", () => {
    const wording = /explains? (each|every|your|the)? ?findings?|explica (cada|los|sus) hallazgos?(?! ni)/i;
    expect(JSON.stringify(en)).not.toMatch(wording);
    expect(JSON.stringify(es)).not.toMatch(wording);
  });
});
