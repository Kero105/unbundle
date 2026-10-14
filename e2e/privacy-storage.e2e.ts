import { expect, test } from "@playwright/test";

// What /privacy says about cookies and browser storage, checked against a real
// browser, signed out. (Sign-in cookies come from Supabase and are checked in
// code, not here: the suite never signs in.)
const PAGES = ["/", "/demo", "/demo/report", "/about", "/help", "/faq", "/rights/check", "/share", "/privacy"];

test("browsing and using the tools sets no cookies and writes no storage", async ({ page, context }) => {
  const setCookieHeaders: string[] = [];
  page.on("response", async (r) => {
    const header = await r.headerValue("set-cookie");
    if (header) setCookieHeaders.push(`${new URL(r.url()).pathname}`);
  });
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // Use the local-only tools too.
  await page.goto("/rights/check");
  await page.getByLabel("People in your household").fill("2");
  await page.getByLabel("Yearly household income (before taxes)").fill("40000");
  await page.getByLabel("Yes, I have insurance").check();
  await page.getByRole("button", { name: "See my estimate" }).click();

  expect(setCookieHeaders).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)])).toEqual([[], []]);
});

test("choosing a language sets only NEXT_LOCALE, and choosing a theme only the theme key", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: /Español/ }).click();
  await page.waitForLoadState("networkidle");

  const cookies = await context.cookies();
  expect(cookies.map((c) => c.name)).toEqual(["NEXT_LOCALE"]);
  const [cookie] = cookies;
  expect(cookie.value).toBe("es");
  expect(cookie.sameSite).toBe("Lax");
  expect(cookie.path).toBe("/");
  const days = (cookie.expires - Date.now() / 1000) / 86400;
  expect(days).toBeGreaterThan(360);
  expect(days).toBeLessThanOrEqual(366);

  await page.getByRole("group", { name: "Apariencia" }).getByRole("button", { name: "Oscuro" }).click();
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual({
    "unbundle-theme": "dark",
  });
  await page.getByRole("group", { name: "Apariencia" }).getByRole("button", { name: "Sistema" }).click();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test("/privacy and the answers that repeat it carry the same cookie disclosure", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 2, name: "Cookies and browser storage" })).toBeVisible();
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Cookies and browser storage" }) });
  await expect(section).toContainText("NEXT_LOCALE");
  await expect(section).toContainText("unbundle-theme");
  await expect(section).toContainText("We do not use analytics, advertising or tracking cookies.");

  const summary = (await page.locator("#summary-title + ul").innerText()).includes(
    "We do not use analytics, advertising or tracking cookies.",
  );
  expect(summary).toBe(true);

  for (const [path, opener] of [
    ["/help", "Is my information private?"],
    ["/faq", "What happens to my bill?"],
  ] as const) {
    await page.goto(path);
    await page.getByText(opener).click();
    await expect(page.locator("details", { hasText: opener })).toContainText(
      "We do not use analytics, advertising or tracking cookies.",
    );
  }
});
