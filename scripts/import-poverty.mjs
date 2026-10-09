// Loads HHS poverty guidelines from scripts/data/poverty-2026.json (figures transcribed
// from the HHS ASPE page named in that file). Prints the values and exits; inserts only
// with --confirm. Local use only; safe to re-run (upsert on primary key).
import fs from "node:fs";
import { serviceClient } from "./lib/env.mjs";
import { upsertAll, rowCount } from "./lib/db.mjs";

const src = JSON.parse(fs.readFileSync("scripts/data/poverty-2026.json", "utf8"));
const rows = [];
for (const [region, { sizes, per_additional }] of Object.entries(src.regions)) {
  if (sizes.length !== 8) throw new Error(`${region}: expected 8 household sizes`);
  sizes.forEach((dollars, i) => {
    rows.push({
      guideline_year: src.year,
      region,
      household_size: i + 1,
      poverty_line_cents: dollars * 100,
      per_additional_person_cents: per_additional * 100,
      source_release: src.source_release,
    });
  });
}

console.log(`Source: ${src.source_url}  (year ${src.year})`);
console.log("region      size  guideline   +per additional");
for (const r of rows) {
  console.log(`${r.region.padEnd(11)} ${String(r.household_size).padStart(4)}  $${(r.poverty_line_cents / 100).toLocaleString("en-US").padStart(8)}   $${(r.per_additional_person_cents / 100).toLocaleString("en-US")}`);
}

if (!process.argv.includes("--confirm")) {
  console.log("\nDry run. Re-run with --confirm to insert.");
  process.exit(0);
}
const db = serviceClient();
await upsertAll(db, "poverty_guidelines", rows, "guideline_year,region,household_size");
const n = await rowCount(db, "poverty_guidelines");
if (n !== rows.length) {
  console.error(`FAILED: poverty_guidelines has ${n} rows, expected ${rows.length}`);
  process.exit(1);
}
console.log(`poverty_guidelines: ${n} rows OK`);
