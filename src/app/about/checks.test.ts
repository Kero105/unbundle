import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import accuracy from "@/lib/accuracy/accuracy.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { rules } from "@/lib/rules";

const root = path.resolve(__dirname, "../../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// Which Home.checks card describes each rule. A new rule fails here until it has a card.
type CardKey = Exclude<keyof typeof en.Home.checks, "title" | "intro">;
const CARD_FOR_RULE: Record<string, CardKey> = {
  duplicate_charge: "duplicates",
  math_error: "math",
  date_mismatch: "dates",
  ncci_unbundling: "unbundling",
  mue_exceeded: "quantity",
  price_outlier: "outliers",
  vague_charge: "vague",
  denied_billed_in_full: "denied",
  balance_billing: "balance",
};

describe("check cards", () => {
  it("has one card for every registered rule, and no extras", () => {
    expect(Object.keys(CARD_FOR_RULE).sort()).toEqual(accuracy.rules.map((r) => r.ruleId).sort());
    expect(Object.keys(CARD_FOR_RULE)).toHaveLength(rules.length);
    const cards = Object.keys(en.Home.checks).filter((k) => k !== "title" && k !== "intro");
    expect(cards.sort()).toEqual(Object.values(CARD_FOR_RULE).sort());
  });

  it("has a title and body in both languages for each card", () => {
    for (const messages of [en, es]) {
      for (const card of Object.values(CARD_FOR_RULE)) {
        const c = messages.Home.checks[card];
        expect(c.title.length, card).toBeGreaterThan(0);
        expect(c.body.length, card).toBeGreaterThan(0);
      }
    }
  });

  it("says the balance billing card needs the EOB", () => {
    expect(en.Home.checks.balance.body).toContain("EOB");
    expect(es.Home.checks.balance.body).toContain("EOB");
  });

  it("renders the card on both the landing page and /about", () => {
    expect(read("src/app/page.tsx")).toContain('"balance"');
    expect(read("src/app/about/page.tsx")).toContain('"balance"');
  });

  it("keeps the About count text in step: nine rules, two need an EOB", () => {
    expect(en.About.checks.intro).toContain("nine rules");
    expect(en.About.checks.intro).toMatch(/Seven run on every bill\. Two run only/);
    expect(es.About.checks.intro).toContain("nueve reglas");
    expect(es.About.checks.intro).toContain("Siete se aplican a cada factura. Dos");
  });
});
