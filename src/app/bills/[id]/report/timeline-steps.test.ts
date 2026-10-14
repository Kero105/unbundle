import { describe, expect, it } from "vitest";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import { demoSource, stepHref } from "@/lib/bills/source";
import { TIMELINE_STEPS, timelineLinks } from "./timeline-steps";

const hrefsFor = (source: Parameters<typeof stepHref>[0]) => ({
  itemized: stepHref(source, "letter", { type: "itemized" }),
  summary: stepHref(source, "summary"),
  letter: stepHref(source, "letter"),
});

describe("timelineLinks", () => {
  it("links each step to an existing letter, summary, guide or checklist", () => {
    const links = timelineLinks(hrefsFor({ kind: "bill", id: "abc" }), true);
    expect(links.itemized.href).toBe("/bills/abc/letter?type=itemized");
    expect(links.review.href).toBe("/bills/abc/report/summary");
    expect(links.dispute.href).toBe("/bills/abc/letter");
    expect(links.followUp.href).toBe("/checklist");
  });

  it("keeps the demo scenario on every link", () => {
    const links = timelineLinks(hrefsFor(demoSource("er-visit")), true);
    expect(links.itemized.href).toContain("scenario=er-visit");
    expect(links.review.href).toContain("scenario=er-visit");
    expect(links.dispute.href).toContain("scenario=er-visit");
  });

  it("does not send people to an empty dispute letter when there are no findings", () => {
    const links = timelineLinks(hrefsFor({ kind: "demo" }), false);
    expect(links.dispute).toEqual({ href: "/rights#itemized-title", linkKey: "linkNoFindings" });
    expect(links.itemized.href).toBe("/demo/letter?type=itemized");
  });
});

describe("timeline copy", () => {
  it.each([
    ["en", en],
    ["es", es],
  ] as const)("has every step in %s and states no deadline", (_, messages) => {
    const timeline = messages.Report.timeline;
    for (const step of TIMELINE_STEPS) {
      const s = timeline.steps[step] as Record<string, string>;
      expect(s.title.length, step).toBeGreaterThan(0);
      expect(s.body.length, step).toBeGreaterThan(0);
      expect(s.link.length, step).toBeGreaterThan(0);
      // No dates or time limits: nothing here is tied to a cited source.
      expect(`${s.title} ${s.body}`, step).not.toMatch(/\d|\bdays?\b|\bweeks?\b|\bdías?\b|\bsemanas?\b/i);
    }
    expect(timeline.steps.dispute.linkNoFindings.length).toBeGreaterThan(0);
  });

  it("lists exactly four steps, in order", () => {
    expect([...TIMELINE_STEPS]).toEqual(["itemized", "review", "dispute", "followUp"]);
  });
});
