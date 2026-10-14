import { expect, test, type Page } from "@playwright/test";

// Theme choice: System / Light / Dark in the footer. Dark page background is
// #0f1a1f and light is #faf7f2 (see globals.css).
const DARK = "rgb(15, 26, 31)";
const LIGHT = "rgb(250, 247, 242)";

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const attr = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const stored = (page: Page) => page.evaluate(() => localStorage.getItem("unbundle-theme"));
const group = (page: Page) => page.getByRole("group", { name: "Appearance" });

test("with no choice the page follows the system setting", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await attr(page)).toBeNull();
  expect(await bodyBg(page)).toBe(DARK);
  await expect(group(page).getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");

  await page.emulateMedia({ colorScheme: "light" });
  expect(await bodyBg(page)).toBe(LIGHT);
});

test("a choice overrides the system, persists across reload, and System clears it", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/about");

  await group(page).getByRole("button", { name: "Dark" }).click();
  expect(await attr(page)).toBe("dark");
  expect(await stored(page)).toBe("dark");
  expect(await bodyBg(page)).toBe(DARK);
  await expect(group(page).getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");

  // Survives a reload and a trip to another page.
  await page.reload();
  expect(await attr(page)).toBe("dark");
  expect(await bodyBg(page)).toBe(DARK);
  await expect(group(page).getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Glossary" }).click();
  await expect(page).toHaveURL(/\/glossary$/);
  expect(await bodyBg(page)).toBe(DARK);

  // Light wins over a dark system.
  await page.emulateMedia({ colorScheme: "dark" });
  await group(page).getByRole("button", { name: "Light" }).click();
  expect(await stored(page)).toBe("light");
  expect(await bodyBg(page)).toBe(LIGHT);
  await page.reload();
  expect(await bodyBg(page)).toBe(LIGHT);

  // System removes the choice entirely.
  await group(page).getByRole("button", { name: "System" }).click();
  expect(await attr(page)).toBeNull();
  expect(await stored(page)).toBeNull();
  expect(await bodyBg(page)).toBe(DARK);
});

test("the saved choice is applied before the page paints", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("unbundle-theme", "dark");
    // What the document looked like when parsing finished, before any React code ran.
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __early: unknown }).__early = {
        theme: document.documentElement.getAttribute("data-theme"),
        bg: getComputedStyle(document.body ?? document.documentElement).backgroundColor,
      };
    });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const early = await page.evaluate(() => (window as unknown as { __early: unknown }).__early);
  expect(early).toEqual({ theme: "dark", bg: DARK });
});

test("it works with storage blocked: the choice holds for the visit and nothing errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const deny = () => {
      throw new DOMException("denied", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", { get: deny, configurable: true });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(group(page)).toBeVisible();

  await group(page).getByRole("button", { name: "Dark" }).click();
  expect(await attr(page)).toBe("dark");
  expect(await bodyBg(page)).toBe(DARK);

  // Still dark after client-side navigation.
  await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "FAQ" }).click();
  await expect(page).toHaveURL(/\/faq$/);
  expect(await bodyBg(page)).toBe(DARK);
  expect(errors).toEqual([]);
});

test("the control works from the keyboard", async ({ page }) => {
  await page.goto("/");
  const dark = group(page).getByRole("button", { name: "Dark" });
  await dark.focus();
  await expect(dark).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await group(page).getByRole("button", { name: "Light" }).focus();
  await page.keyboard.press("Space");
  await expect(group(page).getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
  expect(await attr(page)).toBe("light");
});

test("Spanish labels", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "es", url: baseURL! }]);
  await page.goto("/");
  const g = page.getByRole("group", { name: "Apariencia" });
  await expect(g.getByRole("button", { name: "Sistema" })).toBeVisible();
  await expect(g.getByRole("button", { name: "Claro" })).toBeVisible();
  await expect(g.getByRole("button", { name: "Oscuro" })).toBeVisible();
});

test("paper stays light even when dark is chosen", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("unbundle-theme", "dark"));
  await page.goto("/demo/report");
  await expect(page.getByText("Across 2 findings")).toBeVisible();
  expect(await bodyBg(page)).toBe(DARK);

  await page.emulateMedia({ media: "print" });
  expect(await bodyBg(page)).toBe("rgb(255, 255, 255)");
  const card = await page.evaluate(() => {
    const el = document.querySelector("main ol > li [data-slot=card]")!;
    return { bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color };
  });
  expect(card.bg).toBe("rgb(255, 255, 255)");
  expect(card.fg).toBe("rgb(27, 42, 51)");
});
