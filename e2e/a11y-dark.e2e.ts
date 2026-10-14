import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The same axe scan as a11y.e2e.ts, with dark mode on: once by explicit choice
// (what the toggle saves) and once by the system setting alone. Contrast of
// text, links, buttons, badges, severity colours, form controls, focus rings,
// demo tips and the stacked accuracy cards is what axe checks here.
const PAGES = [
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
  "/share",
  "/demo/review",
  "/demo/report",
  "/demo/report?scenario=er-visit",
  "/demo/report/summary",
  "/demo/letter",
  "/demo/assistance",
];
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const locale of ["en", "es"] as const) {
  for (const path of PAGES) {
    test(`axe dark (chosen) ${locale} ${path}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL! }]);
      await page.addInitScript(() => localStorage.setItem("unbundle-theme", "dark"));
      await page.emulateMedia({ colorScheme: "light" }); // the choice must beat the system
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");

      const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(
        result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
      ).toEqual([]);
    });
  }
}

for (const path of ["/", "/demo/report", "/about", "/demo/review"]) {
  test(`axe dark (system) ${path}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBeNull();

    const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
}
