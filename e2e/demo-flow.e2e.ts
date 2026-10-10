import { expect, test } from "@playwright/test";

// Signed-out demo flow only: no sign-in, no uploads, no database, no Anthropic.
// All data is the bundled synthetic sample bill.
test("signed-out sample bill flow", async ({ page }) => {
  // Landing -> sample
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("hospital bill");
  await page.getByRole("link", { name: "Try a sample bill" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await page.getByRole("link", { name: "Start the sample" }).click();

  // Review: rows read, flagged rows block continuing until verified
  await expect(page).toHaveURL(/\/demo\/review$/);
  await expect(page.getByText("We read 7 rows from your bill.")).toBeVisible();
  await expect(page.getByText("Verify the 3 flagged rows to continue.")).toBeVisible();

  for (const row of [2, 6, 7]) {
    await page.getByRole("checkbox", { name: `Mark row ${row} as verified` }).click();
  }
  await expect(page.getByText("All flagged rows are verified.")).toBeVisible();
  await page.getByRole("link", { name: "Looks right, continue" }).click();

  // Report: findings from the precomputed deterministic rules
  await expect(page).toHaveURL(/\/demo\/report$/);
  await expect(page.getByText("Across 2 findings")).toBeVisible();
  await expect(page.getByRole("region", { name: "Findings" })).toBeVisible();

  // Letter preview
  await page.getByRole("link", { name: "Create a dispute letter" }).click();
  await expect(page).toHaveURL(/\/demo\/letter$/);
  await expect(page.getByRole("heading", { name: "Your dispute letter" })).toBeVisible();
  await expect(page.getByLabel("Letter preview")).toContainText("Request for an itemized bill");

  // Assistance result
  await page.goto("/demo/assistance");
  await page.getByLabel("People in your household").fill("3");
  await page.getByLabel("Yearly household income (before taxes)").fill("30000");
  await page.getByLabel("Yes, I have insurance").check();
  await page.getByRole("button", { name: "See my estimate" }).click();
  await expect(page.getByRole("heading", { name: "Your estimate" })).toBeVisible();
  await expect(page.getByText(/Your household income is about \d+% of the federal poverty level/)).toBeVisible();
});
