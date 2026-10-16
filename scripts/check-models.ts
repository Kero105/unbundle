/**
 * Prints the model each Anthropic feature resolves to from the environment and
 * exits 1 if any is not the intended one (EXPECTED_MODELS). No API calls; the
 * API key and Supabase keys are never read or printed.
 *
 *   npm run check:models [-- --strict] [-- --model <id>]
 *
 * --strict (or VERCEL_ENV=production) also requires EXTRACTION_MODEL and
 * EXPLAIN_MODEL to be set explicitly rather than falling back to a default.
 * Values come from the shell, then .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { checkModels, modelsPass, renderModelTable } from "../src/lib/models/check-models";

const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadEnvLocal();
const argv = process.argv.slice(2);
const rows = checkModels(process.env, { strict: argv.includes("--strict"), argv });
console.log(renderModelTable(rows));
process.exit(modelsPass(rows) ? 0 : 1);
