import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// A cheap structural guard; the real keyboard behavior is in e2e/demo-flow.e2e.ts.
describe("skip link", () => {
  it("is the first element in the page and targets the focusable content region", () => {
    const layout = read("src/app/layout.tsx");
    const link = read("src/components/skip-link.tsx");
    const target = /href="#([\w-]+)"/.exec(link)?.[1];
    expect(target).toBe("content");
    expect(layout).toContain(`id="${target}"`);
    // The region has to be focusable for the jump to move keyboard focus.
    expect(layout).toMatch(/id="content"\s+tabIndex=\{-1\}/);
    // Rendered before the header, so it never waits for the session.
    expect(layout.indexOf("<SkipLink />")).toBeGreaterThan(-1);
    expect(layout.indexOf("<SkipLink />")).toBeLessThan(layout.indexOf("<SiteHeader />"));
  });

  it("does not depend on the session: the header no longer owns it", () => {
    const header = read("src/components/site-header.tsx");
    expect(header).not.toContain('href="#content"');
    const link = read("src/components/skip-link.tsx");
    expect(link).not.toMatch(/supabase|connection\(/);
  });

  it("is hidden until focused, then visible", () => {
    const link = read("src/components/skip-link.tsx");
    expect(link).toContain("sr-only");
    expect(link).toContain("focus:not-sr-only");
  });

  it("has text in both languages", () => {
    expect(en.Shell.skipToContent.length).toBeGreaterThan(0);
    expect(es.Shell.skipToContent.length).toBeGreaterThan(0);
    expect(es.Shell.skipToContent).not.toBe(en.Shell.skipToContent);
  });

  it("is also on the last-resort error page, which replaces the layout", () => {
    const globalError = read("src/app/global-error.tsx");
    expect(globalError).toContain('href="#content"');
    expect(globalError).toMatch(/id="content"\s+tabIndex=\{-1\}/);
  });

  it("targets a page-level main landmark on the key pages", () => {
    for (const file of ["src/app/help/page.tsx", "src/app/demo/page.tsx", "src/app/page.tsx"]) {
      expect(read(file)).toMatch(/<main\b/);
    }
  });
});
