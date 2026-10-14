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

// Header and footer are the same on every page, fit a phone, and every page has a way back.
test("nav and footer are consistent and fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ["/", "/about", "/help", "/methodology", "/rights", "/rights/check", "/glossary", "/checklist", "/faq", "/privacy", "/terms"]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav).toBeVisible();
    for (const name of ["How it works", "Know your rights", "Try a sample"]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
    await expect(nav.getByRole("button", { name: "Sign in" })).toBeVisible();

    const footer = page.getByRole("navigation", { name: "Footer" });
    for (const name of ["Glossary", "Check an estimate", "Checklist", "FAQ", "About", "Privacy", "Terms", "Help"]) {
      await expect(footer.getByRole("link", { name })).toBeVisible();
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow, path).toBe(false);
  }
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

// The report's "What happens next" timeline: four steps, each linking to a page that exists.
test("report timeline has four linked steps", async ({ page }) => {
  await page.goto("/demo/report");
  const timeline = page.getByRole("region", { name: "What happens next" });
  await expect(timeline).toBeVisible();
  await expect(timeline.getByRole("listitem")).toHaveCount(4);
  await expect(timeline.getByRole("link", { name: "See the itemized-bill request letter" })).toHaveAttribute(
    "href",
    "/demo/letter?type=itemized",
  );
  await expect(timeline.getByRole("link", { name: "Open the dispute letter" })).toHaveAttribute(
    "href",
    "/demo/letter",
  );
  await timeline.getByRole("link", { name: "Use the checklist and notes page" }).click();
  await expect(page).toHaveURL(/\/checklist$/);
});

// The sample walk-through: dismissible tips, keyboard reachable, in memory only.
test("demo walk-through tips point at the source, a finding and the letter", async ({ page }) => {
  const tip = page.getByRole("complementary", { name: "Sample walk-through tip" });

  // 1. Source, on the review page. "Show me" highlights it and says so.
  await page.goto("/demo/review");
  await expect(tip).toBeVisible();
  await expect(tip.getByText("Tip 1 of 4")).toBeVisible();
  await tip.getByRole("button", { name: "Show me" }).focus();
  await page.keyboard.press("Enter");
  await expect(tip.getByRole("status")).toHaveText("The highlighted item is now in view.");
  const source = page.locator("[data-walkthrough='source']:visible");
  await expect(source).toBeFocused();
  await expect(source).toHaveCSS("outline-style", "solid");

  // Dismissed with the button; focus lands on the page content, not on nothing.
  await tip.getByRole("button", { name: "Dismiss this tip" }).click();
  await expect(tip).toHaveCount(0);
  await expect(page.locator("#content")).toBeFocused();

  // Nothing is stored: a reload brings the tip back.
  expect(await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length)).toBe(0);
  await page.reload();
  await expect(tip.getByText("Tip 1 of 4")).toBeVisible();

  // 2 and 3. Finding, then the letter button, on the report. Escape dismisses.
  await page.goto("/demo/report");
  await expect(tip.getByText("Tip 2 of 4")).toBeVisible();
  await tip.getByRole("button", { name: "Show me" }).click();
  await expect(page.locator("[data-walkthrough='finding']")).toBeFocused();
  await tip.getByRole("button", { name: "Show me" }).focus();
  await page.keyboard.press("Escape");
  await expect(tip.getByText("Tip 3 of 4")).toBeVisible();
  await expect(tip.getByRole("heading", { name: "Turn the findings into a letter" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(tip).toHaveCount(0);

  // 4. Letter. Dismissals survive client-side navigation within the demo.
  await page.getByRole("link", { name: "Open the dispute letter" }).click();
  await expect(page).toHaveURL(/\/demo\/letter$/);
  await expect(tip.getByText("Tip 4 of 4")).toBeVisible();
  // "Show me" waits for the streamed page, so it works even if clicked early.
  await tip.getByRole("button", { name: "Show me" }).click();
  await expect(page.locator("[data-walkthrough='preview']")).toBeFocused();
  await page.getByRole("link", { name: "Back to report" }).click();
  await expect(page).toHaveURL(/\/demo\/report$/);
  await expect(tip).toHaveCount(0);
});

test("demo walk-through skips finding tips when nothing is flagged, and has Spanish", async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto("/demo/report?scenario=clean");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Sample walk-through tip" })).toHaveCount(0);

  await context.addCookies([{ name: "NEXT_LOCALE", value: "es", url: baseURL! }]);
  await page.goto("/demo/review");
  const tip = page.getByRole("complementary", { name: "Consejo de la guía del ejemplo" });
  await expect(tip.getByText("Consejo 1 de 4")).toBeVisible();
  await expect(tip.getByRole("button", { name: "Muéstrame" })).toBeVisible();
  await expect(tip.getByRole("button", { name: "Descartar este consejo" })).toBeVisible();
});

// The FAQ: eleven questions, each with a source link, a date and the advice note.
test("faq answers carry sources, a date and the not-legal-advice note", async ({ page }) => {
  await page.goto("/faq");
  const questions = page.locator("main details");
  await expect(questions).toHaveCount(11);

  const dispute = page.locator("details#gfeDispute");
  await dispute.locator("summary").click();
  await expect(dispute.getByRole("link", { name: "CMS: Dispute a medical bill" })).toHaveAttribute(
    "href",
    "https://www.cms.gov/medical-bill-rights/help/dispute-a-bill",
  );
  await expect(dispute.getByText(/Last checked: .*2026.*General information, not legal advice\./)).toBeVisible();

  // The privacy answer is the Privacy page's own summary.
  await page.locator("details#privacy summary").click();
  await expect(page.locator("details#privacy")).toContainText("We never sell your information.");
  await expect(page.locator("details#privacy")).toContainText("Those are Anthropic's terms, not ours.");

  // Help shows the same privacy wording, including the billing-code exception.
  await page.goto("/help");
  await page.getByText("Is my information private?").click();
  const helpPrivacy = page.locator("details", { hasText: "Is my information private?" });
  await expect(helpPrivacy).toContainText("The only other thing sent is a single billing code");
  await expect(helpPrivacy).toContainText("We never sell your information.");

  // Reachable from Help.
  await page.getByRole("link", { name: "More answers, each with its source" }).click();
  await expect(page).toHaveURL(/\/faq$/);
});
