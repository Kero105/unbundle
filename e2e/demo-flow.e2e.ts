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

// Keyboard: the first Tab stop is a visible skip link that moves focus to the main content.
test("skip link is reachable by keyboard and works", async ({ page }) => {
  for (const path of ["/", "/demo", "/help"]) {
    await page.goto(path);
    const skip = page.getByRole("link", { name: "Skip to main content" });
    // The header streams in behind Suspense; wait for it before tabbing.
    await expect(skip).toBeAttached();
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#content")).toBeFocused();
  }
});

// The standalone checker needs no bill and no sign-in, and nothing typed there
// leaves the page: no request carries the values and nothing lands in storage.
test("standalone checker works signed out and sends nothing", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" || r.url().includes("?")) requests.push(`${r.method()} ${r.url()}`);
  });

  await page.goto("/rights/check");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Check an estimate");
  await expect(page.getByText("Nothing you type on this page is sent or saved.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  requests.length = 0;

  await page.getByLabel("People in your household").fill("3");
  await page.getByLabel("Yearly household income (before taxes)").fill("31337");
  await page.getByLabel("No, I am uninsured or paying myself").check();
  await page.getByLabel("Total on the estimate").fill("1000");
  await page.getByLabel("Total on the bill").fill("1500");
  await page.getByRole("button", { name: "See my estimate" }).click();
  await expect(page.getByRole("heading", { name: "Your estimate" })).toBeVisible();

  expect(requests).toEqual([]);
  expect(page.url()).not.toContain("31337");
  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage).length,
    session: Object.keys(sessionStorage).length,
    cookies: document.cookie.includes("31337"),
  }));
  expect(stored).toEqual({ local: 0, session: 0, cookies: false });
});

// The accuracy table is stacked cards at phone width: nothing wider than the
// screen, and all nine rules plus the total are readable without sideways scroll.
test("about accuracy table is readable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/about");
  const list = page.getByRole("list", { name: /accuracy/i });
  await expect(list).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  // The sideways-scrolling table region is only for wider screens.
  await expect(page.locator('[role="region"][tabindex="0"]')).toBeHidden();

  const wide = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll("body *")].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.right > w + 1;
    }).length;
  });
  expect(wide).toBe(0);
});
