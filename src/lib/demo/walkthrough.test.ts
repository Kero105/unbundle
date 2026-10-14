import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { DEMO_SCENARIOS } from "./scenarios";
import { applicableTips, CLEAN_SCENARIO, currentTip, TIP_IDS, TIPS, type TipId } from "./walkthrough";

describe("walk-through tips", () => {
  it("has three to four tips, one per id, all on demo pages", () => {
    expect(TIPS.length).toBeGreaterThanOrEqual(3);
    expect(TIPS.length).toBeLessThanOrEqual(4);
    expect(TIPS.map((t) => t.id)).toEqual([...TIP_IDS]);
    for (const tip of TIPS) expect(tip.path.startsWith("/demo/")).toBe(true);
  });

  it("points at a finding, its source and the letter", () => {
    expect(TIPS.map((t) => t.target).sort()).toEqual(["finding", "letter", "preview", "source"]);
  });

  it("uses the real clean scenario id", () => {
    expect([...DEMO_SCENARIOS]).toContain(CLEAN_SCENARIO);
  });

  it("skips finding and dispute-letter tips when nothing is flagged", () => {
    expect(applicableTips(CLEAN_SCENARIO).map((t) => t.id)).toEqual(["source", "preview"]);
    expect(applicableTips("standard")).toHaveLength(4);
    expect(applicableTips(null)).toHaveLength(4);
  });

  it("shows the first undismissed tip for the page, numbered among those that apply", () => {
    const none = new Set<TipId>();
    expect(currentTip("/demo/review", null, none)).toMatchObject({ number: 1, total: 4, tip: { id: "source" } });
    expect(currentTip("/demo/report", null, none)?.tip.id).toBe("finding");
    expect(currentTip("/demo/report", null, new Set<TipId>(["finding"]))?.tip.id).toBe("letterLink");
    expect(currentTip("/demo/report", null, new Set<TipId>(["finding", "letterLink"]))).toBeNull();
    expect(currentTip("/demo/letter", CLEAN_SCENARIO, none)).toMatchObject({ number: 2, total: 2 });
  });

  it("shows nothing on pages with no tip", () => {
    expect(currentTip("/demo", null, new Set())).toBeNull();
    expect(currentTip("/demo/assistance", null, new Set())).toBeNull();
    expect(currentTip("/about", null, new Set())).toBeNull();
  });

  it.each([
    ["en", en],
    ["es", es],
  ] as const)("has strings for every tip in %s", (_, messages) => {
    const w = messages.Demo.walkthrough;
    for (const id of TIP_IDS) {
      expect(w.tips[id].title.length, id).toBeGreaterThan(0);
      expect(w.tips[id].body.length, id).toBeGreaterThan(0);
    }
    expect(Object.keys(w.tips).sort()).toEqual([...TIP_IDS].sort());
    for (const k of ["label", "step", "show", "dismiss", "pointed"] as const) {
      expect(w[k].length, k).toBeGreaterThan(0);
    }
  });
});
