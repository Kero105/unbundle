import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Print output is checked with print media emulated and the OS set to dark, so a
// dark screen can never leak onto paper. Synthetic demo data only.
const PAGES = [
  "/checklist",
  "/demo/report",
  "/demo/report?scenario=er-visit",
  "/demo/report/summary",
  "/demo/letter",
  "/demo/letter?type=itemized",
] as const;

for (const route of PAGES) {
  test(`print ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ media: "print", colorScheme: "dark" });

    // No navigation, footer or controls on paper.
    await expect(page.locator("nav:visible")).toHaveCount(0);
    await expect(page.locator("footer:visible")).toHaveCount(0);
    await expect(page.locator("button:visible")).toHaveCount(0);
    await expect(page.locator("a[class*='group/button']:visible")).toHaveCount(0);

    // Light colours: a white page with dark text.
    const colors = await page.evaluate(() => {
      const rgb = (v: string) => (v.match(/\d+/g) ?? []).slice(0, 3).map(Number);
      return {
        bg: rgb(getComputedStyle(document.body).backgroundColor),
        fg: rgb(getComputedStyle(document.querySelector("main h1")!).color),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(colors.bg).toEqual([255, 255, 255]);
    expect(Math.max(...colors.fg)).toBeLessThan(110);
    expect(colors.overflow).toBe(false);

    const pdf = await page.pdf({ format: "Letter", printBackground: false });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const out = process.env.PRINT_PDF_DIR;
    if (out) {
      mkdirSync(out, { recursive: true });
      writeFileSync(path.join(out, `${route.replace(/[^a-z0-9]+/gi, "_")}.pdf`), pdf);
    }
  });
}

test("print report keeps each finding whole and hides the on-screen extras", async ({ page }) => {
  await page.goto("/demo/report");
  await expect(page.getByText("Across 2 findings")).toBeVisible();
  await page.emulateMedia({ media: "print", colorScheme: "dark" });

  const findings = page.locator("main ol > li").filter({ has: page.locator("h3") });
  expect(await findings.count()).toBeGreaterThan(0);
  const breaks = await findings
    .first()
    .locator("xpath=descendant-or-self::*[contains(@class,'break-inside-avoid')]")
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).breakInside));
  expect(breaks).toContain("avoid");

  // The total at stake and the findings stay; the script, reminders and
  // timeline links are screen-only.
  await expect(page.getByText("Across 2 findings")).toBeVisible();
  await expect(page.getByRole("region", { name: "Phone script" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Open the dispute letter" })).toBeHidden();
});

test("print letter shows only the letter", async ({ page }) => {
  await page.goto("/demo/letter");
  await expect(page.getByLabel("Letter preview")).toBeVisible();
  await page.emulateMedia({ media: "print", colorScheme: "dark" });

  await expect(page.getByLabel("Letter preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Letter preview" })).toBeHidden();
  await expect(page.getByRole("textbox").first()).toBeHidden();
});
