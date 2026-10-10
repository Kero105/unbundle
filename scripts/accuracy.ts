/**
 * Local-only accuracy run: every fixture in fixtures/bills goes through runRules using the
 * real Supabase reference tables (createSupabaseLookups). Findings are compared to
 * fixtures/expected on (ruleId, lineItemIds, amountAtStakeCents); an exact match is a true
 * positive. Prints precision/recall per rule and overall, plus mismatches, and writes
 * docs/accuracy.md and src/lib/accuracy/accuracy.json (the numbers the /about page shows).
 *
 * Needs the service role key in .env.local, so it is not a committed test.
 * Output is rule IDs, fixture names and counts only; never bill contents.
 *
 *   npm run accuracy
 */
import fs from "node:fs";
import path from "node:path";
import { ExtractedBillSchema } from "../src/lib/types";
import { runRules } from "../src/lib/rules";
import { createSupabaseLookups } from "../src/lib/rules/supabase-lookups";
import { serviceClient } from "./lib/env.mjs";

const RULE_IDS = [
  "duplicate_charge",
  "math_error",
  "date_mismatch",
  "ncci_unbundling",
  "mue_exceeded",
  "price_outlier",
  "vague_charge",
  "denied_billed_in_full",
];

const root = path.resolve(__dirname, "../fixtures");
const readJson = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(root, ...p), "utf8"));

type Summary = { ruleId: string; lineItemIds: string[]; amountAtStakeCents: number };
const keyOf = (f: Summary) => `${f.ruleId}|${[...f.lineItemIds].sort().join(",")}|${f.amountAtStakeCents}`;
const sharedLines = (a: Summary, b: Summary) => a.ruleId === b.ruleId && [...a.lineItemIds].sort().join() === [...b.lineItemIds].sort().join();

type Counts = { tp: number; fp: number; fn: number };
const zero = (): Counts => ({ tp: 0, fp: 0, fn: 0 });
const ratio = (n: number, d: number) => (d === 0 ? null : n / d);
const pct = (r: number | null) => (r === null ? "n/a" : `${(r * 100).toFixed(1)}%`);

async function main() {
  const lookups = createSupabaseLookups(serviceClient());
  const names = fs
    .readdirSync(path.join(root, "bills"))
    .filter((n) => n.endsWith(".json"))
    .map((n) => n.replace(/\.json$/, ""))
    .sort();

  const perRule = new Map<string, Counts>(RULE_IDS.map((r) => [r, zero()]));
  const counts = (r: string) => {
    if (!perRule.has(r)) perRule.set(r, zero());
    return perRule.get(r)!;
  };
  const mismatches: string[] = [];

  for (const name of names) {
    const bill = ExtractedBillSchema.parse(readJson("bills", `${name}.json`));
    const expected = readJson("expected", `${name}.json`).expectedFindings as Summary[];
    const found: Summary[] = (await runRules(bill, lookups)).map((f) => ({
      ruleId: f.ruleId,
      lineItemIds: f.lineItemIds,
      amountAtStakeCents: f.amountAtStakeCents,
    }));

    const unmatchedExpected = [...expected];
    const unmatchedFound: Summary[] = [];
    for (const f of found) {
      const i = unmatchedExpected.findIndex((e) => keyOf(e) === keyOf(f));
      if (i >= 0) {
        unmatchedExpected.splice(i, 1);
        counts(f.ruleId).tp++;
      } else unmatchedFound.push(f);
    }
    for (const f of unmatchedFound) {
      counts(f.ruleId).fp++;
      const amountOnly = unmatchedExpected.some((e) => sharedLines(e, f));
      mismatches.push(`${name}: unexpected ${f.ruleId}${amountOnly ? " (right line items, wrong amount)" : ""}`);
    }
    for (const e of unmatchedExpected) {
      counts(e.ruleId).fn++;
      mismatches.push(`${name}: missing ${e.ruleId}${found.some((f) => sharedLines(e, f)) ? " (right line items, wrong amount)" : ""}`);
    }
  }

  const total = zero();
  const rows = [...perRule.entries()].map(([ruleId, c]) => {
    total.tp += c.tp;
    total.fp += c.fp;
    total.fn += c.fn;
    return `| ${ruleId} | ${c.tp} | ${c.fp} | ${c.fn} | ${pct(ratio(c.tp, c.tp + c.fp))} | ${pct(ratio(c.tp, c.tp + c.fn))} |`;
  });
  rows.push(`| **overall** | ${total.tp} | ${total.fp} | ${total.fn} | ${pct(ratio(total.tp, total.tp + total.fp))} | ${pct(ratio(total.tp, total.tp + total.fn))} |`);

  const table = [
    "| Rule | TP | FP | FN | Precision | Recall |",
    "|---|---:|---:|---:|---:|---:|",
    ...rows,
  ].join("\n");
  const mismatchBlock = mismatches.length ? mismatches.map((m) => `- ${m}`).join("\n") : "None.";

  const md = `# Accuracy

Rule findings for ${names.length} fixtures compared to their expected files, run through \`runRules\`
with \`createSupabaseLookups\` against the real reference database.

A finding counts as a true positive only when rule ID, line item IDs and amount at stake all match
an expected finding. Anything else found is a false positive; any expected finding not found is a
false negative. Precision and recall are \`n/a\` where the denominator is zero.

${table}

## Mismatches

${mismatchBlock}

## Method

- Fixtures are synthetic bills, not real patient data, and were written alongside the rules, so
  these numbers measure agreement with our own expectations, not real-world accuracy.
- NCCI edits: practitioner PTP edits only (no hospital/outpatient edit set).
- Pricing and MUE checks cover services on the Medicare Physician Fee Schedule only.
- Locality: Los Angeles (LA) only.

Regenerate with \`npm run accuracy\` (needs \`.env.local\`).
`;

  const round4 = (r: number | null) => (r === null ? null : Math.round(r * 10000) / 10000);
  const json = {
    fixtureCount: names.length,
    // Bills written to catch false alarms: the "trap" and "clean" fixtures.
    trapFixtureCount: names.filter((n) => /-(trap|clean)-/.test(n)).length,
    rules: [...perRule.entries()].map(([ruleId, c]) => ({
      ruleId,
      ...c,
      precision: round4(ratio(c.tp, c.tp + c.fp)),
      recall: round4(ratio(c.tp, c.tp + c.fn)),
    })),
    overall: {
      ...total,
      precision: round4(ratio(total.tp, total.tp + total.fp)),
      recall: round4(ratio(total.tp, total.tp + total.fn)),
    },
  };
  fs.mkdirSync(path.resolve(__dirname, "../src/lib/accuracy"), { recursive: true });
  fs.writeFileSync(
    path.resolve(__dirname, "../src/lib/accuracy/accuracy.json"),
    `${JSON.stringify(json, null, 2)}\n`,
  );

  fs.mkdirSync(path.resolve(__dirname, "../docs"), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, "../docs/accuracy.md"), md);

  console.log(`\nAccuracy over ${names.length} fixtures\n`);
  console.log(table);
  console.log(`\nMismatches:\n${mismatchBlock}\n`);
  console.log("Wrote docs/accuracy.md and src/lib/accuracy/accuracy.json");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "unknown error");
  process.exit(1);
});
