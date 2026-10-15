// Renders the app icons from the wordmark's "U" in brand colors.
// Usage: npx tsx scripts/make-pwa-icons.ts
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const TEAL = "#0f5257";
const CREAM = "#faf7f2";
const OUT = path.join(process.cwd(), "public", "icons");

// A geometric "U" on a 100x100 grid, scaled about the centre.
function svg(size: number, scale: number, rounded: boolean): string {
  const radius = rounded ? 22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${radius}" fill="${TEAL}"/>
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    <path d="M32 24 V54 a18 18 0 0 0 36 0 V24" fill="none" stroke="${CREAM}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

async function render(file: string, size: number, scale: number, rounded: boolean) {
  await sharp(Buffer.from(svg(size, scale, rounded))).png().toFile(path.join(OUT, file));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await render("icon-192.png", 192, 1.15, true);
  await render("icon-512.png", 512, 1.15, true);
  // Maskable: full bleed, glyph inside the central 80% safe zone.
  await render("icon-maskable-512.png", 512, 0.9, false);
}

void main();
