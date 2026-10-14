import { expect, test } from "@playwright/test";

// Keyboard access on every public page: the first Tab stop is the skip link, it
// moves focus to the content region, and every Tab stop shows a visible
// focus indicator that is not a resting shadow. Synthetic demo data only.
const PAGES = [
  "/",
  "/demo",
  "/about",
  "/help",
  "/methodology",
  "/rights",
  "/rights/check",
  "/glossary",
  "/checklist",
  "/privacy",
  "/terms",
  "/demo/review",
  "/demo/report",
  "/demo/report/summary",
  "/demo/letter",
  "/demo/assistance",
  "/does-not-exist",
  "/auth/error",
];

for (const route of PAGES) {
  test(`keyboard ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    // 1. Skip link first, visible when focused, and it works.
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#content")).toBeFocused();

    // 2. Every Tab stop on the page shows a focus indicator of its own.
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const problems: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body || el.tagName.toLowerCase() === "nextjs-portal") return null;
        const focused = getComputedStyle(el);
        const outline = focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0;
        const shadowWhenFocused = focused.boxShadow;
        const rect = el.getBoundingClientRect();
        // Compare with the same element unfocused, so a resting shadow does not count.
        el.blur();
        const shadowResting = getComputedStyle(el).boxShadow;
        el.focus();
        const id = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}|${(el.textContent ?? "").trim().slice(0, 24)}|${rect.top | 0},${rect.left | 0}`;
        return {
          id,
          indicated: outline || shadowWhenFocused !== shadowResting,
          sized: rect.width > 0 && rect.height > 0,
        };
      });
      if (!r) break;
      if (seen.has(r.id)) break;
      seen.add(r.id);
      if (!r.indicated || !r.sized) problems.push(`${r.id} indicated=${r.indicated} sized=${r.sized}`);
    }
    expect(problems).toEqual([]);
  });
}
