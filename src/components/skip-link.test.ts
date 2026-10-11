import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// A cheap structural guard; the real keyboard behavior is in e2e/demo-flow.e2e.ts.
describe("skip link", () => {
  it("is the first element in the header and targets the main content region", () => {
    const header = read("src/components/site-header.tsx");
    const layout = read("src/app/layout.tsx");
    const target = /href="#([\w-]+)"/.exec(header)?.[1];
    expect(target).toBe("content");
    expect(layout).toContain(`id="${target}"`);
    // The region has to be focusable for the jump to move keyboard focus.
    expect(layout).toMatch(/id="content"\s+tabIndex=\{-1\}/);
  });

  it("is hidden until focused, then visible", () => {
    const header = read("src/components/site-header.tsx");
    expect(header).toContain("sr-only");
    expect(header).toContain("focus:not-sr-only");
  });

  it("has text in both languages", () => {
    expect(en.Shell.skipToContent.length).toBeGreaterThan(0);
    expect(es.Shell.skipToContent.length).toBeGreaterThan(0);
    expect(es.Shell.skipToContent).not.toBe(en.Shell.skipToContent);
  });

  it("targets a page-level main landmark on the key pages", () => {
    for (const file of ["src/app/help/page.tsx", "src/app/demo/page.tsx", "src/app/page.tsx"]) {
      expect(read(file)).toMatch(/<main\b/);
    }
  });
});
