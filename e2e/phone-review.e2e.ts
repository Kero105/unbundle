import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Phone layout of the review step (under 640px): one row at a time. Synthetic
// sample bill only. Desktop and tablet widths are covered by the other specs.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// The cards mount after hydration; the table is hidden until then.
async function openReview(page: Page) {
  await page.goto("/demo/review");
  await expect(page.getByRole("region", { name: "Review one row at a time" })).toBeVisible();
}

test("shows one row at a time with progress and Previous/Next", async ({ page }) => {
  await openReview(page);
  const progress = page.locator("[aria-live='polite']", { hasText: /^Row \d+ of \d+$/ });
  await expect(progress).toHaveText(/^Row 1 of \d+$/);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(progress).toHaveText(/^Row 2 of \d+$/);
  // Exactly one set of fields on screen.
  await expect(page.getByLabel(/^Description, row \d+$/)).toHaveCount(1);
});

test("edits a field in the card and keeps its accessible name", async ({ page }) => {
  await openReview(page);
  const field = page.getByLabel(/^Description, row \d+$/);
  await field.fill("Edited description");
  await field.blur();
  await expect(field).toHaveValue("Edited description");
});

test("All rows is a full-screen dialog: focus trapped, Escape closes, focus returns", async ({
  page,
}) => {
  await openReview(page);
  const trigger = page.getByRole("button", { name: "All rows" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "All rows" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    // Base UI parks focus on a guard span for a tick before wrapping it back.
    await expect
      .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("choosing a row in All rows jumps to it", async ({ page }) => {
  await openReview(page);
  await page.getByRole("button", { name: "All rows" }).click();
  const dialog = page.getByRole("dialog", { name: "All rows" });
  await dialog.getByRole("button").filter({ hasText: "Row 3" }).first().click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel("Description, row 3")).toBeVisible();
});

test("Show on bill scrolls the source panel into view and Back to row returns to the card", async ({
  page,
}) => {
  await openReview(page);
  const show = page.getByRole("button", { name: /^Show row \d+ on the original bill$/ });
  const name = (await show.getAttribute("aria-label")) ?? "";
  const row = name.match(/\d+/)![0];
  await show.scrollIntoViewIfNeeded();
  await show.click();
  const panel = page.locator("details[data-walkthrough='source']");
  await expect(panel).toHaveAttribute("open", "");
  await expect(panel.getByTestId("source-highlight")).toBeVisible();
  await expect(panel.getByRole("status")).toContainText(`row ${row}`);
  await expect(panel).toBeInViewport();

  await panel.getByRole("button", { name: `Back to row ${row}` }).click();
  await expect(show).toBeFocused();
  await expect(show).toBeInViewport();
});

test("a skeleton fills the page before the cards hydrate (no blank flash)", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // Hold back the app bundles so the page stays in its server-rendered state.
  await context.route("**/_next/static/**/*.js", (route) => route.abort());
  const page = await context.newPage();
  await page.goto("/demo/review");
  await expect(page.getByTestId("review-skeleton")).toBeVisible();
  await expect(page.getByRole("table")).toBeHidden();
  await context.close();
});

test("no horizontal scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openReview(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`axe: card view, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openReview(page);
    const card = await new AxeBuilder({ page }).analyze();
    expect(card.violations.map((v) => v.id)).toEqual([]);
    await page.getByRole("button", { name: "All rows" }).click();
    await expect(page.getByRole("dialog", { name: "All rows" })).toBeVisible();
    const sheet = await new AxeBuilder({ page }).analyze();
    expect(sheet.violations.map((v) => v.id)).toEqual([]);
  });
}
