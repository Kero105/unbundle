import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import {
  GFE_DIFFERENCE_THRESHOLD_CENTS,
  GFE_DISPUTE_WINDOW_DAYS,
} from "@/lib/assistance";
import { RIGHTS_SOURCES, RIGHTS_STEPS } from "./rights-sources";

const both = [
  ["en", en],
  ["es", es],
] as const;

describe("rights", () => {
  it("gives every guide at least one https source with a label and a checked date", () => {
    const seen = new Set<string>();
    for (const guide of ["assistance", "gfe", "itemized"] as const) {
      expect(RIGHTS_SOURCES[guide].length).toBeGreaterThan(0);
      for (const { key, href } of RIGHTS_SOURCES[guide]) {
        expect(href.startsWith("https://")).toBe(true);
        expect(seen.has(href)).toBe(false);
        seen.add(href);
        for (const [, messages] of both) {
          const sources = messages.Rights.guides[guide].sources as Record<string, string>;
          expect(sources[key]?.length, `${guide}.${key}`).toBeGreaterThan(0);
          expect(messages.Rights.guides[guide].checked.length).toBeGreaterThan(0);
        }
      }
      for (const step of RIGHTS_STEPS[guide]) {
        const steps = en.Rights.guides[guide].steps as Record<string, string>;
        expect(steps[step]?.length, `${guide}.${step}`).toBeGreaterThan(0);
      }
    }
  });

  it("repeats the thresholds the checker uses", () => {
    expect(GFE_DIFFERENCE_THRESHOLD_CENTS).toBe(40000);
    expect(GFE_DISPUTE_WINDOW_DAYS).toBe(120);
    for (const [, messages] of both) {
      const who = messages.Rights.guides.gfe.who;
      expect(who).toContain("$400");
      expect(who).toContain("120");
      expect(who).toContain("$25");
    }
  });

  it("titles the general CMS link for the page it opens, not a page that redirects", () => {
    const link = RIGHTS_SOURCES.gfe.find((s) => s.key === "cmsCosts");
    expect(link?.href).toBe("https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights");
    expect(en.Rights.guides.gfe.sources.cmsCosts).toContain("Medical bill rights");
    expect(es.Rights.guides.gfe.sources.cmsCosts).toContain("Medical bill rights");
    for (const guide of ["assistance", "gfe", "itemized"] as const) {
      for (const { href } of RIGHTS_SOURCES[guide]) {
        expect(href).not.toContain("understanding-costs-in-advance");
      }
    }
  });

  it("says in both languages that the page is not legal advice", () => {
    expect(en.Rights.notAdvice).toMatch(/not legal advice/i);
    expect(es.Rights.notAdvice).toMatch(/no asesoría legal/i);
  });
});
