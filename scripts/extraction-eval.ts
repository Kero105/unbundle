/**
 * Runs the REAL extractor on the synthetic bill images and compares line items
 * to fixtures/images/manifest.json (code, date, units, charge cents). Writes
 * docs/extraction-eval.md with per-field accuracy and mismatches listed by
 * fixture id, row number and field name only: no bill text or values.
 *
 * Not part of `npm test`. Makes one paid API call per image, so it only runs
 * when EXTRACTION_MODE=anthropic and ANTHROPIC_API_KEY are set, and refuses
 * more than 30 calls unless --yes is passed.
 *
 *   npm run eval:extraction [-- --yes] [--limit N] [--only <fixture-id>]
 */
import fs from "node:fs";
import path from "node:path";
import { detectFileType } from "../src/lib/bills/upload-validation";
import { createExtractor, readExtractionConfig } from "../src/lib/extraction";
import { toErrorCode } from "../src/lib/extraction/errors";
import { compareLines, renderReport, type EvalLine, type ReportEntry } from "../src/lib/extraction/eval-compare";

const MAX_CALLS_WITHOUT_YES = 30;
const root = path.resolve(__dirname, "..");
const imagesDir = path.join(root, "fixtures/images");

type ManifestEntry = {
  file: string;
  fixtureId: string;
  variant: string;
  expected: { lineItems: EvalLine[] };
};

/** Local .env.local reader; values are never printed. */
function loadEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  loadEnvLocal();
  if (process.env.EXTRACTION_MODE?.trim().toLowerCase() !== "anthropic" || !process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error(
      "Refusing to run: set EXTRACTION_MODE=anthropic and ANTHROPIC_API_KEY (this makes paid API calls).",
    );
    process.exit(1);
  }
  const config = readExtractionConfig();
  if (config.mode !== "anthropic") process.exit(1);

  const manifest = JSON.parse(fs.readFileSync(path.join(imagesDir, "manifest.json"), "utf8")) as {
    entries: ManifestEntry[];
  };
  let entries = manifest.entries;
  const only = argValue("--only");
  if (only) entries = entries.filter((e) => e.fixtureId === only);
  const limit = Number(argValue("--limit"));
  if (Number.isInteger(limit) && limit > 0) entries = entries.slice(0, limit);

  const yes = process.argv.includes("--yes");
  if (entries.length > MAX_CALLS_WITHOUT_YES && !yes) {
    console.error(
      `This would make ${entries.length} API calls (limit ${MAX_CALLS_WITHOUT_YES} without --yes). ` +
        "Re-run with --yes, or narrow it with --limit N or --only <fixture-id>.",
    );
    process.exit(1);
  }
  if (entries.length === 0) {
    console.error("No images matched.");
    process.exit(1);
  }

  const extractor = createExtractor(config);
  const results: ReportEntry[] = [];
  console.log(`Evaluating ${entries.length} images with model ${config.model}`);

  for (const entry of entries) {
    const bytes = new Uint8Array(fs.readFileSync(path.join(imagesDir, entry.file)));
    const mimeType = detectFileType(bytes);
    const base = { fixtureId: entry.fixtureId, file: entry.file, variant: entry.variant };
    if (!mimeType) {
      results.push({ ...base, comparison: compareLines(entry.expected.lineItems, []), errorCode: "unsupported_type" });
      continue;
    }
    try {
      const bill = await extractor.extractBill([{ kind: "bill", mimeType, bytes }]);
      const got: EvalLine[] = bill.lineItems.map((i) => ({
        code: i.code,
        dateOfService: i.dateOfService,
        units: i.units,
        chargeCents: i.chargeCents,
      }));
      const comparison = compareLines(entry.expected.lineItems, got);
      results.push({ ...base, comparison });
      console.log(`${entry.file}: ${comparison.mismatches.length} row mismatches`);
    } catch (error) {
      const errorCode = toErrorCode(error);
      // A failure counts as every expected row missing, so it can't inflate accuracy.
      results.push({ ...base, comparison: compareLines(entry.expected.lineItems, []), errorCode });
      console.log(`${entry.file}: failed (${errorCode})`);
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const out = path.join(root, "docs/extraction-eval.md");
  fs.writeFileSync(out, renderReport(results, { model: config.model, date }));
  console.log("Wrote docs/extraction-eval.md");
}

main().catch(() => {
  console.error("Evaluation failed.");
  process.exit(1);
});
