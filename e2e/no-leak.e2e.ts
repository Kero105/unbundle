import { expect, test, type Browser, type Page } from "@playwright/test";

// A form that is not yet hydrated (or whose JavaScript is off) submits natively.
// For a form without an action that is a GET to the same page with every named
// field in the query string, which would put typed answers into the URL, the
// history and server logs. These tests submit in exactly those situations and
// assert that nothing is sent and the address does not change. Public pages only.
const FORMS = [
  { path: "/rights/check", name: "estimate checker" },
  { path: "/demo/assistance", name: "demo estimate step" },
] as const;

async function fillAndSubmit(page: Page, viaEnter: boolean) {
  await page.getByLabel("People in your household").fill("4");
  await page.getByLabel("Yearly household income (before taxes)").fill("98765");
  await page.getByLabel("No, I am uninsured or paying myself").check();
  if (viaEnter) {
    await page.getByLabel("Yearly household income (before taxes)").press("Enter");
  } else {
    await page.getByRole("button", { name: "See my estimate" }).click();
  }
  // Give any navigation a moment to start.
  await page.waitForTimeout(500);
}

function watch(page: Page) {
  const seen: string[] = [];
  page.on("request", (r) => seen.push(`${r.method()} ${r.url()}`));
  return seen;
}

async function jsOff(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  return { context, page: await context.newPage() };
}

for (const { path, name } of FORMS) {
  for (const viaEnter of [false, true]) {
    const how = viaEnter ? "Enter key" : "submit button";

    test(`${name}: JavaScript off, ${how}, sends nothing and keeps the address`, async ({ browser, baseURL }) => {
      const { context, page } = await jsOff(browser, baseURL!);
      await page.goto(path);
      const before = page.url();
      const requests = watch(page);

      // Without JavaScript, streamed page content stays in a hidden container, so
      // the form is normally unreachable. If that ever changes it must still be safe.
      if (await page.getByRole("button", { name: "See my estimate" }).isVisible()) {
        await fillAndSubmit(page, viaEnter);
      } else {
        await expect(page.locator("form").first()).toBeHidden();
      }

      expect(page.url()).toBe(before);
      expect(page.url()).not.toContain("?");
      expect(requests).toEqual([]);
      await context.close();
    });

    test(`${name}: scripts not loaded yet (before hydration), ${how}, sends nothing`, async ({ page }) => {
      // Page scripts never arrive, which is the state of a real page before hydration.
      await page.route("**/_next/static/**", (route) => route.abort());
      await page.goto(path);
      await expect(page.getByRole("button", { name: "See my estimate" })).toBeVisible();
      const before = page.url();
      const requests = watch(page);

      await fillAndSubmit(page, viaEnter);

      expect(page.url()).toBe(before);
      expect(page.url()).not.toContain("?");
      expect(requests).toEqual([]);
    });
  }

  test(`${name}: hydrated, submitting computes locally and the address stays clean`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const before = page.url();
    const requests = watch(page);

    // Even a native submit would carry nothing: no control in the form is serialized.
    expect(
      await page.evaluate(() => [...new FormData(document.querySelector("form")!).keys()]),
    ).toEqual([]);

    // The radios still behave as one group, with the arrow keys.
    const insured = page.getByLabel("Yes, I have insurance");
    const uninsured = page.getByLabel("No, I am uninsured or paying myself");
    await insured.check();
    await insured.press("ArrowDown");
    await expect(uninsured).toBeChecked();
    await expect(insured).not.toBeChecked();

    await fillAndSubmit(page, false);
    await expect(page.getByRole("heading", { name: "Your estimate" })).toBeVisible();

    expect(page.url()).toBe(before);
    expect(requests.filter((r) => !r.startsWith("GET"))).toEqual([]);
    expect(requests.some((r) => r.includes("98765") || r.includes("insurance="))).toBe(false);
  });
}
