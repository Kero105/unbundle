/**
 * Prints WCAG contrast ratios for the globals.css color tokens (light and dark)
 * and exits 1 if any pair is below AA (4.5 text, 3 for borders/focus rings).
 *
 *   JITI_ALIAS='{"@":"./src"}' npx jiti scripts/check-contrast.ts
 */
import { readFileSync } from "node:fs";
import { checkContrast } from "../src/lib/a11y/contrast";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const results = checkContrast(css);
for (const r of results) {
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.theme.padEnd(5)}  ${r.ratio.toFixed(2).padStart(5)}  (min ${r.pair.min})  ${r.pair.fg} on ${r.pair.bg}  ${r.pair.note}`,
  );
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} failing pair(s)` : "\nAll pairs pass AA");
process.exit(failed ? 1 : 0);
