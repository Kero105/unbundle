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
  for (const path of ["/", "/about", "/help", "/methodology", "/rights", "/rights/check", "/glossary", "/checklist", "/faq", "/share", "/privacy", "/terms"]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav).toBeVisible();
    for (const name of ["How it works", "Know your rights", "Try a sample"]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
    await expect(nav.getByRole("button", { name: "Sign in" })).toBeVisible();

    const footer = page.getByRole("navigation", { name: "Footer" });
    for (const name of ["Glossary", "Check an estimate", "Checklist", "FAQ", "Share", "About", "Privacy", "Terms", "Help"]) {
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
  // One section: four steps, then the things worth asking along the way.
  await expect(timeline.locator("ol > li")).toHaveCount(4);
  await expect(timeline.getByRole("heading", { name: "You can also ask" })).toBeVisible();
  await expect(timeline.locator("ul > li")).toHaveCount(3);
  await expect(timeline).toContainText("Write down the date, the time, and the name of the person you spoke with");
  await expect(timeline).toContainText("financial assistance policy and the application");
  // The older, overlapping section is gone.
  await expect(page.getByRole("heading", { name: "What to do next" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "What happens next" })).toHaveCount(1);
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

// /share: one configured address feeds the link, the buttons and the QR code.
test("share page shows the configured link, a labelled QR code and working buttons", async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL! });
  // Stand in for a phone's share sheet, so the button shows and we see what it is given.
  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown[] }).__shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: unknown) => {
        (window as unknown as { __shared: unknown[] }).__shared.push(data);
      },
    });
  });
  await page.goto("/share");
  const origin = new URL(baseURL!).origin;

  const qr = page.getByRole("img", { name: `QR code that opens ${origin}` });
  await expect(qr).toBeVisible();
  await expect(qr.locator("svg")).toHaveCount(1);
  await expect(page.getByText(origin, { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link copied." })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(origin);

  await page.getByRole("button", { name: "Share…" }).click();
  expect(await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared)).toEqual([
    { title: "Unbundle", url: origin },
  ]);

  // No tracking parameters anywhere on the page.
  const html = await page.content();
  expect(html).not.toMatch(/utm_|fbclid|gclid/);
});

test("share page has no share button without navigator.share, and the QR stays black on white", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/share");
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share…" })).toHaveCount(0);

  const qr = page.getByRole("img", { name: /QR code that opens/ });
  const colors = await qr.evaluate((el) => {
    const svg = el.querySelector("svg")!;
    return {
      wrapper: getComputedStyle(el).backgroundColor,
      fills: [...svg.querySelectorAll("[fill]")].map((n) => n.getAttribute("fill")),
    };
  });
  expect(colors.wrapper).toBe("rgb(255, 255, 255)");
  expect(new Set(colors.fills)).toEqual(new Set(["#ffffff", "#000000"]));
});

test("share card prints on its own, in light colors", async ({ page }) => {
  await page.goto("/share");
  await page.emulateMedia({ media: "print", colorScheme: "dark" });
  await expect(page.getByRole("heading", { name: "Check a medical bill with Unbundle" })).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code that opens/ })).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "The link" })).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
});

// Decode the code itself where the browser can, so "encodes exactly the URL" is
// checked on the pixels, not just on the markup.
test("QR code decodes to exactly the shown link", async ({ page, baseURL }) => {
  await page.goto("/share");
  const result = await page.evaluate(async () => {
    const Detector = (window as unknown as { BarcodeDetector?: new (o: object) => { detect(i: ImageBitmap): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector) return { supported: false as const };
    const svg = document.querySelector('[role="img"] svg')!.outerHTML;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace("<svg ", '<svg width="330" height="330" '));
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 330;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const found = await new Detector({ formats: ["qr_code"] }).detect(await createImageBitmap(canvas));
    return { supported: true as const, values: found.map((f) => f.rawValue) };
  });
  test.skip(!result.supported, "This browser has no BarcodeDetector, so the pixels cannot be decoded here.");
  expect(result).toEqual({ supported: true, values: [new URL(baseURL!).origin] });
});
