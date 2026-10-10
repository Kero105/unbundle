/**
 * Local-only: runs the demo bill through runRules against the real reference
 * tables once, and writes the results to committed JSON so the public demo
 * never needs a database:
 *
 *   fixtures/review/demo-findings.json   the findings (what the demo shows)
 *   fixtures/review/demo-reference.json  every lookup result the rules read,
 *                                        plus the poverty guidelines
 *
 * Needs the service role key in .env.local (reads public reference tables
 * only; the demo itself never uses the key). Output is counts only.
 *
 *   JITI_ALIAS='{"@":"./src"}' npx jiti scripts/precompute-demo-findings.ts
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DemoReferenceSchema, recordLookups } from "../src/lib/demo/reference-snapshot";
import { runRules } from "../src/lib/rules";
import { createSupabaseLookups } from "../src/lib/rules/supabase-lookups";
import { ExtractedBillSchema } from "../src/lib/types";
import { serviceClient } from "./lib/env.mjs";

const dir = path.resolve(__dirname, "../fixtures/review");

const PovertyDbRow = z.object({
  guideline_year: z.number().int(),
  region: z.enum(["contiguous", "AK", "HI"]),
  household_size: z.number().int().min(1).max(8),
  poverty_line_cents: z.coerce.number().int().positive(),
  per_additional_person_cents: z.coerce.number().int().positive(),
});

async function main() {
  const db = serviceClient();
  const bill = ExtractedBillSchema.parse(
    JSON.parse(fs.readFileSync(path.join(dir, "demo-bill.json"), "utf8")),
  );

  const { lookups, rules } = recordLookups(createSupabaseLookups(db));
  const findings = await runRules(bill, lookups);

  // Same query and newest-year selection as getPovertyGuidelines().
  const { data, error } = await db
    .from("poverty_guidelines")
    .select("guideline_year, region, household_size, poverty_line_cents, per_additional_person_cents")
    .eq("region", "contiguous")
    .order("guideline_year", { ascending: false })
    .limit(8);
  if (error) throw new Error(`poverty_guidelines query failed (${error.code ?? "n/a"})`);
  const parsed = z.array(PovertyDbRow).parse(data);
  const guidelineYear = parsed[0].guideline_year;
  const rows = parsed
    .filter((r) => r.guideline_year === guidelineYear)
    .map((r) => ({
      guidelineYear: r.guideline_year,
      region: r.region,
      householdSize: r.household_size,
      povertyLineCents: r.poverty_line_cents,
      perAdditionalPersonCents: r.per_additional_person_cents,
    }))
    .sort((a, b) => a.householdSize - b.householdSize);

  const reference = DemoReferenceSchema.parse({ rules, poverty: { guidelineYear, rows } });

  fs.writeFileSync(path.join(dir, "demo-findings.json"), `${JSON.stringify(findings, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "demo-reference.json"), `${JSON.stringify(reference, null, 2)}\n`);
  console.log(
    `findings: ${findings.length}; recorded lookups: ptp ${rules.ptp.length}, mue ${rules.mue.length}, rate ${rules.rate.length}; poverty rows: ${rows.length} (${guidelineYear})`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "precompute failed");
  process.exit(1);
});
