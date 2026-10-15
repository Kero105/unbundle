import { expect, test } from "@playwright/test";

// Synthetic sample bill only: no sign-in, no uploads, no database, no API key.
// Narrow window: the original bill sits in a collapsed panel above the table.
// Wide window (2xl, 1536px): it is a side panel that is always shown.
const button = { name: "Show row 1 on the original bill" };

test("Show on bill opens the source panel in a narrow window", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/demo/review");
  const panel = page.locator("details[data-walkthrough='source']");
  await expect(panel).not.toHaveAttribute("open", "");
  await page.getByRole("button", button).click();
  await expect(panel).toHaveAttribute("open", "");
  await expect(panel.getByRole("status")).toContainText("row 1");
  await expect(panel.getByTestId("source-highlight")).toBeVisible();
});

test("Show on bill highlights the row in the side panel in a wide window", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/demo/review");
  const side = page.getByRole("complementary", { name: "Original bill" });
  await expect(side).toBeVisible();
  await page.getByRole("button", button).click();
  await expect(side.getByRole("status")).toContainText("row 1");
  await expect(side.getByTestId("source-highlight")).toBeVisible();
});
