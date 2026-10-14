import { appendFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Signed-out accessibility scan: no sign-in, no uploads, no Anthropic. Every
// page here renders from bundled static content or the synthetic demo snapshots.
// Output names rule, impact, page and a CSS selector only; never element text.

const SCENARIOS = ["standard", "er-visit", "clean"] as const;
const STATIC_PAGES = [
  "/",
  "/demo",
  "/about",
  "/privacy",
  "/terms",
  "/help",
  "/methodology",
  "/rights",
  "/rights/check",
  "/glossary",
  "/checklist",
  "/faq",
];
const DEMO_STEPS = ["review", "report", "report/summary", "letter", "assistance"];

const PAGES = [
  ...STATIC_PAGES,
  ...SCENARIOS.flatMap((s) => DEMO_STEPS.map((step) => `/demo/${step}?scenario=${s}`)),
];

const LOCALES = ["en", "es"] as const;
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

type Row = {
  locale: string;
  page: string;
  rule: string;
  impact: string | null | undefined;
  wcag: boolean;
  nodes: string[];
  help: string;
};

// Failures restart the worker, so append one JSON line per violation as we go.
function record(row: Row) {
  const out = process.env.A11Y_REPORT;
  if (out) appendFileSync(out, JSON.stringify(row) + "\n");
}

for (const locale of LOCALES) {
  for (const path of PAGES) {
    test(`axe ${locale} ${path}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL! }]);
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");

      const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      for (const v of result.violations) {
        record({
          locale,
          page: path,
          rule: v.id,
          impact: v.impact,
          wcag: v.tags.some((t) => t.startsWith("wcag")),
          nodes: v.nodes.map((n) => n.target.join(" ")),
          help: v.help,
        });
      }
      expect(result.violations.map((v) => v.id)).toEqual([]);
    });
  }
}

