import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkContrast, contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colors", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, 5);
  });
});

describe("globals.css tokens", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const results = checkContrast(css);

  it("checks both themes", () => {
    expect(new Set(results.map((r) => r.theme))).toEqual(new Set(["light", "dark"]));
  });

  it("meets WCAG AA for every text/background pair", () => {
    const failures = results
      .filter((r) => !r.ok)
      .map((r) => `${r.theme} ${r.pair.fg}/${r.pair.bg} ${r.ratio.toFixed(2)} < ${r.pair.min}`);
    expect(failures).toEqual([]);
  });
});
