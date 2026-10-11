/**
 * Renders every fixture in fixtures/bills as a fictional hospital bill image
 * and PDF into fixtures/images/, plus degraded variants, and writes
 * fixtures/images/manifest.json (ground truth for scripts/extraction-eval.ts).
 *
 * Uses the Playwright Chromium already installed for the e2e tests; the
 * degraded variants are made with a canvas in that same browser. Everything is
 * fictional and every page carries a "SAMPLE - FICTIONAL" footer.
 *
 *   npm run make:bill-images
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { ExtractedBillSchema } from "../src/lib/types";
import { renderBillHtml, type Layout } from "./lib/bill-html";

const root = path.resolve(__dirname, "..");
const billsDir = path.join(root, "fixtures/bills");
const outDir = path.join(root, "fixtures/images");

const LAYOUTS: Layout[] = ["itemized", "summary", "twocolumn"];
const SCALE = 1.6; // 8.5in at 96dpi * 1.6 = 1306px wide

type Degrade = {
  variant: string;
  rotateDeg: number;
  scale: number;
  shadow: boolean;
  quality: number;
  note: string;
};

/** Which fixtures get which degraded copy. Spread across the three layouts. */
const DEGRADED: Record<string, Degrade> = {
  "bill-01-duplicate-charge": { variant: "rotated", rotateDeg: 2.5, scale: 1, shadow: false, quality: 0.9, note: "rotated 2.5 degrees on a gray desk" },
  "bill-02-math-error": { variant: "lowres", rotateDeg: 0, scale: 0.4, shadow: false, quality: 0.8, note: "downscaled to about 520px wide" },
  "bill-03-date-outside-range": { variant: "jpeg-artifacts", rotateDeg: 0, scale: 0.7, shadow: false, quality: 0.2, note: "heavy JPEG compression" },
  "bill-04-ncci-unbundling": { variant: "shadow", rotateDeg: 0, scale: 1, shadow: true, quality: 0.85, note: "shadow gradient across the page" },
  "bill-05-ncci-indicator1-no-modifier": { variant: "phone-photo", rotateDeg: -1.5, scale: 0.8, shadow: true, quality: 0.5, note: "rotated, shadowed and compressed like a phone photo" },
};

const TWO_PAGE_FIXTURE = "bill-13-clean-office-visit";

type ManifestEntry = {
  file: string;
  fixtureId: string;
  layout: Layout | "twopage";
  variant: string;
  format: "png" | "jpg" | "pdf";
  pageCount: number;
  note?: string;
  expected: {
    totalBilledCents: number;
    lineItems: { code: string | null; dateOfService: string | null; units: number; chargeCents: number }[];
  };
};

async function degrade(page: Page, pngBase64: string, d: Degrade): Promise<Buffer> {
  const jpegBase64 = await page.evaluate(
    async ({ png, d }) => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image"));
        img.src = `data:image/png;base64,${png}`;
      });
      const w = Math.round(img.width * d.scale);
      const h = Math.round(img.height * d.scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = d.rotateDeg !== 0 ? "#6e6a64" : "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((d.rotateDeg * Math.PI) / 180);
      const fit = d.rotateDeg !== 0 ? 0.94 : 1;
      ctx.drawImage(img, (-w * fit) / 2, (-h * fit) / 2, w * fit, h * fit);
      ctx.restore();
      if (d.shadow) {
        const g = ctx.createLinearGradient(w, 0, 0, h);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.55, "rgba(0,0,0,0.12)");
        g.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      return canvas.toDataURL("image/jpeg", d.quality).split(",")[1];
    },
    { png: pngBase64, d },
  );
  return Buffer.from(jpegBase64, "base64");
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const names = fs
    .readdirSync(billsDir)
    .filter((n) => n.endsWith(".json"))
    .map((n) => n.replace(/\.json$/, ""))
    .sort();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 816, height: 1056 },
    deviceScaleFactor: SCALE,
  });
  const page = await context.newPage();
  const manifest: ManifestEntry[] = [];

  async function render(html: string) {
    await page.setContent(html, { waitUntil: "load" });
  }

  for (const [index, name] of names.entries()) {
    const bill = ExtractedBillSchema.parse(JSON.parse(fs.readFileSync(path.join(billsDir, `${name}.json`), "utf8")));
    const layout = LAYOUTS[index % LAYOUTS.length];
    const expected = {
      totalBilledCents: bill.totalBilledCents,
      lineItems: bill.lineItems.map((i) => ({
        code: i.code,
        dateOfService: i.dateOfService,
        units: i.units,
        chargeCents: i.chargeCents,
      })),
    };
    const add = (entry: Omit<ManifestEntry, "fixtureId" | "expected">) =>
      manifest.push({ ...entry, fixtureId: name, expected });

    await render(renderBillHtml(bill, index, layout));
    const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 816, height: 1056 } });
    fs.writeFileSync(path.join(outDir, `${name}.png`), png);
    add({ file: `${name}.png`, layout, variant: "clean", format: "png", pageCount: 1 });

    const pdf = await page.pdf({ width: "8.5in", height: "11in", printBackground: true });
    fs.writeFileSync(path.join(outDir, `${name}.pdf`), pdf);
    add({ file: `${name}.pdf`, layout, variant: "clean", format: "pdf", pageCount: 1 });

    const d = DEGRADED[name];
    if (d) {
      const jpg = await degrade(page, png.toString("base64"), d);
      const file = `${name}.${d.variant}.jpg`;
      fs.writeFileSync(path.join(outDir, file), jpg);
      add({ file, layout, variant: d.variant, format: "jpg", pageCount: 1, note: d.note });
    }

    if (name === TWO_PAGE_FIXTURE) {
      await render(renderBillHtml(bill, index, "twopage"));
      const two = await page.pdf({ width: "8.5in", height: "11in", printBackground: true });
      const file = `${name}.2page.pdf`;
      fs.writeFileSync(path.join(outDir, file), two);
      add({ file, layout: "twopage", variant: "two-page", format: "pdf", pageCount: 2, note: "summary on page 1, itemized detail on page 2" });
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(
      {
        description:
          "Fictional bill images rendered from fixtures/bills. 'expected' is the ground-truth extraction for each file.",
        entries: manifest,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${manifest.length} files and manifest.json to fixtures/images`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
