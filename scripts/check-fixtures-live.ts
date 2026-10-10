/**
 * Local-only check: runs fixtures 4, 5, 6, 10 and 11 through runRules using the real
 * Supabase reference tables (createSupabaseLookups), compares to fixtures/expected,
 * and confirms the NCCI PTP deletion-date inclusivity against real data.
 *
 * Needs the service role key in .env.local, so it is not a committed test.
 * Output is pass/fail and rule IDs only; never bill contents.
 *
 *   JITI_ALIAS='{"@":"./src"}' npx jiti scripts/check-fixtures-live.ts
 */
import fs from "node:fs";
import path from "node:path";
import { ExtractedBillSchema } from "../src/lib/types";
import { runRules } from "../src/lib/rules";
import { createSupabaseLookups } from "../src/lib/rules/supabase-lookups";
import { serviceClient } from "./lib/env.mjs";

const FIXTURES = [
  "bill-04-ncci-unbundling",
  "bill-05-ncci-indicator1-no-modifier",
  "bill-06-mue-exceeded",
  "bill-10-trap-ptp-modifier-59",
  "bill-11-trap-mue-at-limit",
];
const root = path.resolve(__dirname, "../fixtures");
const readJson = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(root, ...p), "utf8"));

type Summary = { ruleId: string; lineItemIds: string[]; amountAtStakeCents: number };
const summarize = (fs: Summary[]) =>
  fs
    .map((f) => ({ ruleId: f.ruleId, lineItemIds: [...f.lineItemIds].sort(), amountAtStakeCents: f.amountAtStakeCents }))
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId) || a.lineItemIds.join().localeCompare(b.lineItemIds.join()));

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const db = serviceClient();
  const lookups = createSupabaseLookups(db);
  let allOk = true;

  console.log("\nFixtures against live reference data:");
  for (const name of FIXTURES) {
    const bill = ExtractedBillSchema.parse(readJson("bills", `${name}.json`));
    const expected = readJson("expected", `${name}.json`).expectedFindings as Summary[];
    const found = await runRules(bill, lookups);
    const ok = JSON.stringify(summarize(found)) === JSON.stringify(summarize(expected));
    if (!ok) allOk = false;
    const ids = found.map((f) => f.ruleId);
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}  rules found: [${ids.join(", ")}]  expected: [${expected.map((e) => e.ruleId).join(", ")}]`);
  }

  console.log("\nPTP deletion-date inclusivity (edit_set 1):");
  const { data, error } = await db
    .from("ncci_ptp")
    .select("column1_code, column2_code, effective_date, deletion_date")
    .eq("edit_set", 1)
    .not("deletion_date", "is", null)
    .order("deletion_date", { ascending: false })
    .limit(1);
  if (error) throw new Error(`ncci_ptp query failed (${error.code ?? "n/a"})`);
  if (!data?.length) {
    console.log("  no ncci_ptp row with a non-null deletion_date found; cannot confirm");
    allOk = false;
  } else {
    const { column1_code: c1, column2_code: c2, effective_date: eff, deletion_date: del } = data[0];
    const at = (date: string) =>
      lookups.getPtpEdits(c1, c2, date).then((edits) => edits.some((e) => e.effectiveDate === eff && e.deletionDate === del));
    const onDeletion = await at(del);
    const dayAfter = await at(addDays(del, 1));
    const dayBefore = await at(addDays(del, -1));
    console.log(`  pair ${c1}/${c2}  effective ${eff}  deletion ${del}`);
    console.log(`  day before deletion: ${dayBefore ? "active" : "inactive"}`);
    console.log(`  on deletion date:    ${onDeletion ? "active" : "inactive"}`);
    console.log(`  day after deletion:  ${dayAfter ? "active" : "inactive"}`);
    const inclusive = onDeletion && !dayAfter;
    console.log(`  adapter treats deletion date as inclusive (last active day): ${inclusive ? "YES" : "NO"}`);
    console.log("  note: this confirms the adapter's behavior on real rows, not CMS's intent.");
  }

  console.log(`\n${allOk ? "ALL PASS" : "FAILURES PRESENT"}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "unknown error");
  process.exit(1);
});
