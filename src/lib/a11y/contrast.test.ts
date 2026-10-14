import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkContrast, contrastRatio, parseTokens, printTokens, systemDarkTokens } from "./contrast";

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

describe("theme blocks in globals.css", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const tokens = parseTokens(css);

  it("reads dark from its own block, not from whatever comes last in the file", () => {
    // Dark is not the light palette and not the print palette.
    expect(tokens.dark.background).not.toBe(tokens.light.background);
    expect(tokens.dark.background).not.toBe(printTokens(css).background);
    expect(tokens.dark.background).toBe("#0f1a1f");
  });

  it("repeats the dark palette identically for 'system is dark' and 'dark chosen'", () => {
    const explicit = Object.fromEntries(
      Object.entries(tokens.dark).filter(([k, v]) => tokens.light[k] !== v || k in systemDarkTokens(css)),
    );
    expect(systemDarkTokens(css)).toEqual(explicit);
  });

  it("overrides every colour token in dark that light defines", () => {
    const dark = systemDarkTokens(css);
    for (const name of Object.keys(tokens.light)) {
      if (name === "radius") continue;
      expect(name in dark, name).toBe(true);
    }
  });

  it("prints with the light palette", () => {
    expect(printTokens(css)).toMatchObject({ foreground: tokens.light.foreground });
    for (const name of Object.keys(tokens.light)) {
      expect(printTokens(css)[name], name).toBeDefined();
    }
  });

  it("keeps severity readable without colour: every badge carries an icon and a text label", () => {
    const report = readFileSync(new URL("../../app/bills/[id]/report/report-view.tsx", import.meta.url), "utf8");
    expect(report).toMatch(/<severity\.Icon aria-hidden="true" \/>\s*\{t\("finding\.severity"/);
    expect(report).toMatch(/<confidence\.Icon aria-hidden="true" \/>\s*\{t\("finding\.confidence"/);
  });
});
