import { describe, expect, it } from "vitest";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import { demoSource, stepHref } from "@/lib/bills/source";
import { ALSO_ASK, TIMELINE_STEPS, timelineLinks } from "./timeline-steps";

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

describe("merged section", () => {
  it("is the only next-steps section: the older list and its messages are gone", () => {
    expect("nextSteps" in en.Report).toBe(false);
    expect("nextSteps" in es.Report).toBe(false);
    expect([...ALSO_ASK]).toEqual(["assistance", "collections", "insurer"]);
  });

  it.each([
    ["en", en],
    ["es", es],
  ] as const)("has the intro, the also-ask list and every step in %s", (_, messages) => {
    const t = messages.Report.timeline;
    expect(t.intro.length).toBeGreaterThan(0);
    expect(t.alsoTitle.length).toBeGreaterThan(0);
    for (const key of ALSO_ASK) expect(t.also[key].length, key).toBeGreaterThan(0);
    expect(Object.keys(t.also).sort()).toEqual([...ALSO_ASK].sort());
  });

  it("keeps every useful line from the older list", () => {
    const all = (m: typeof en | typeof es) => JSON.stringify(m.Report.timeline);
    for (const phrase of [
      "Write down the date, the time, and the name of the person you spoke with",
      "fully itemized bill that shows a billing code for every charge",
      "financial assistance policy and the application, even if you are not sure you qualify",
      "not be sent to collections while the bill is being reviewed",
      "in writing",
      "keep a copy for your records",
      "ask your insurer to review the claim",
      "You do not have to do all of this at once",
    ]) {
      expect(all(en), phrase).toContain(phrase);
    }
    for (const phrase of [
      "Anote la fecha, la hora y el nombre de la persona con quien habló",
      "factura totalmente detallada que muestre un código de facturación para cada cargo",
      "política de asistencia financiera del hospital y la solicitud",
      "no se envíe a cobranza mientras se revisa la factura",
      "por escrito",
      "guarde una copia para sus registros",
      "aseguradora que revise el reclamo",
      "No tiene que hacerlo todo de una vez",
    ]) {
      expect(all(es), phrase).toContain(phrase);
    }
  });

  it("states no deadline in the also-ask lines either", () => {
    for (const m of [en, es]) {
      for (const key of ALSO_ASK) {
        expect(m.Report.timeline.also[key], key).not.toMatch(/\d|\bdays?\b|\bweeks?\b|\bdías?\b|\bsemanas?\b/i);
      }
    }
  });
});

