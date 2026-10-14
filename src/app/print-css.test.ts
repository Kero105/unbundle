import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "globals.css"), "utf8");

/** The body of the first `@media <query> {` block, matched by brace depth. */
function mediaBlock(query: string): string {
  // A top-level rule only: `@custom-variant dark (@media ...)` also mentions the query.
  const start = css.search(new RegExp(`^@media ${query.replace(/[()]/g, "\\$&")} \\{`, "m"));
  expect(start, query).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error("unbalanced braces");
}

const vars = (block: string) => new Set([...block.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

describe("print stylesheet", () => {
  const print = mediaBlock("print");
  const dark = mediaBlock("(prefers-color-scheme: dark)");

  it("re-declares every colour token the dark theme overrides, so paper stays light", () => {
    const printVars = vars(print);
    for (const name of vars(dark)) {
      expect(printVars.has(name), name).toBe(true);
    }
  });

  it("forces the light colour scheme and a white page", () => {
    expect(print).toContain("color-scheme: light");
    expect(print).toMatch(/background:\s*#fff\s*!important/);
  });

  it("hides navigation and controls and keeps list items and rows whole", () => {
    for (const selector of ["nav", "button", 'a[class*="group/button"]']) {
      expect(print).toContain(selector);
    }
    expect(print).toMatch(/display:\s*none\s*!important/);
    expect(print).toMatch(/break-inside:\s*avoid/);
  });
});
