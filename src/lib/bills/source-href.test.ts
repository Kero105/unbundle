import { describe, expect, it } from "vitest";
import { DEMO_SOURCE, demoSource, stepHref } from "./source";

describe("stepHref", () => {
  it("keeps standard demo URLs free of a query", () => {
    expect(stepHref(DEMO_SOURCE, "review")).toBe("/demo/review");
    expect(stepHref(demoSource("standard"), "report")).toBe("/demo/report");
  });

  it("carries a non-standard scenario through every step", () => {
    const er = demoSource("er-visit");
    expect(stepHref(er, "review")).toBe("/demo/review?scenario=er-visit");
    expect(stepHref(er, "summary")).toBe("/demo/report/summary?scenario=er-visit");
    expect(stepHref(er, "letter", { type: "itemized" })).toBe("/demo/letter?type=itemized&scenario=er-visit");
  });

  it("builds bill URLs with extra query and an encoded id", () => {
    expect(stepHref({ kind: "bill", id: "abc" }, "letter", { type: "itemized" })).toBe(
      "/bills/abc/letter?type=itemized",
    );
    expect(stepHref({ kind: "bill", id: "a/b" }, "summary")).toBe("/bills/a%2Fb/report/summary");
  });
});
