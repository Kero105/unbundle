import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { CHECKLIST_ITEMS, ITEMIZED_LETTER_HREF } from "./checklist-items";

const root = path.resolve(__dirname, "../../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("checklist", () => {
  it.each([
    ["en", en],
    ["es", es],
  ] as const)("has a title and body for every item in %s", (_, messages) => {
    for (const item of CHECKLIST_ITEMS) {
      const entry = messages.Checklist.items[item];
      expect(entry.title.length, item).toBeGreaterThan(0);
      expect(entry.body.length, item).toBeGreaterThan(0);
    }
  });

  it("lists exactly the items in the messages, in the agreed set", () => {
    expect(Object.keys(en.Checklist.items).sort()).toEqual([...CHECKLIST_ITEMS].sort());
    expect([...CHECKLIST_ITEMS]).toEqual(["itemized", "eob", "dates", "account", "member"]);
  });

  it("links the itemized-bill request letter, which exists", () => {
    expect(ITEMIZED_LETTER_HREF).toBe("/demo/letter?type=itemized");
    expect(fs.existsSync(path.join(root, "src/app/demo/letter/page.tsx"))).toBe(true);
    expect(read("src/app/checklist/page.tsx")).toContain("ITEMIZED_LETTER_HREF");
  });

  it("keeps no state and makes no requests", () => {
    const page = read("src/app/checklist/page.tsx");
    for (const banned of ["useState", "localStorage", "sessionStorage", "fetch(", "<input", "<form", "document.cookie"]) {
      expect(page, banned).not.toContain(banned);
    }
  });

  it("has a not-legal-advice note and says nothing is saved, in both languages", () => {
    expect(en.Checklist.notAdvice).toMatch(/not legal advice/i);
    expect(es.Checklist.notAdvice).toMatch(/no asesoría legal/i);
    expect(en.Checklist.nothingSaved.length).toBeGreaterThan(0);
    expect(es.Checklist.nothingSaved.length).toBeGreaterThan(0);
  });

  it("is linked from the footer and listed for the axe checks", () => {
    expect(read("src/components/site-footer.tsx")).toContain('"/checklist"');
    expect(read("e2e/a11y.e2e.ts")).toContain('"/checklist"');
  });
});
