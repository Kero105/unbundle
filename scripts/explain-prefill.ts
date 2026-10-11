/**
 * Fills the shared `code_explanations` cache for a reviewed list of common
 * codes (scripts/data/explain-codes.json). Local only: it uses the service
 * role key from .env.local, refuses to run in CI, and is the only thing that
 * writes the cache; no route, page or server action does.
 *
 * Each entry goes through the same strict code validation, the same
 * AnthropicExplainer (no bill text involved: only the code and language) and
 * the same output validation as live requests. Output is counts only.
 * Existing rows are never overwritten.
 *
 *   npm run explain:prefill [-- --yes] [--limit N]
 *
 * Needs ANTHROPIC_API_KEY in .env.local. More than 30 model calls need --yes.
 */
import fs from "node:fs";
import path from "node:path";
import { AnthropicExplainer } from "../src/lib/explain/anthropic-explainer";
import { readExplainConfig } from "../src/lib/explain/config";
import { parsePrefillList } from "../src/lib/explain/prefill";
import { toExplainErrorCode } from "../src/lib/explain/types";
import { ExplanationTextSchema } from "../src/lib/explain/validate";
import { serviceClient } from "./lib/env.mjs";

const MAX_CALLS_WITHOUT_YES = 30;
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

async function main() {
  if (process.env.CI) {
    console.error("Refusing to run in CI.");
    process.exit(1);
  }
  loadEnvLocal();

  // Same fail-closed config as the app, but this script always wants the model.
  const config = readExplainConfig({ ...process.env, EXPLAIN_MODE: "anthropic" });
  if (config.mode !== "anthropic") process.exit(1);

  const list = parsePrefillList(
    JSON.parse(fs.readFileSync(path.join(__dirname, "data/explain-codes.json"), "utf8")),
  );

  const db = serviceClient();
  const { data, error } = await db.from("code_explanations").select("code, language");
  if (error) throw new Error("cache_read_failed");
  const existing = new Set((data ?? []).map((r) => `${r.code}|${r.language}`));

  let todo = list.filter((e) => !existing.has(`${e.code}|${e.language}`));
  const limit = Number(process.argv[process.argv.indexOf("--limit") + 1]);
  if (process.argv.includes("--limit") && Number.isInteger(limit) && limit > 0) todo = todo.slice(0, limit);

  if (todo.length > MAX_CALLS_WITHOUT_YES && !process.argv.includes("--yes")) {
    console.error(
      `This would make ${todo.length} model calls (limit ${MAX_CALLS_WITHOUT_YES} without --yes). Re-run with --yes or --limit N.`,
    );
    process.exit(1);
  }

  const explainer = AnthropicExplainer.fromApiKey(config.apiKey, config.model);
  let written = 0;
  const failures: Record<string, number> = {};

  for (const entry of todo) {
    try {
      const text = ExplanationTextSchema.parse(await explainer.explainCode(entry));
      const { error: writeError } = await db
        .from("code_explanations")
        .upsert({ code: entry.code, language: entry.language, text }, { onConflict: "code,language", ignoreDuplicates: true });
      if (writeError) throw new Error("cache_write_failed");
      written += 1;
    } catch (e) {
      const code = e instanceof Error && e.message === "cache_write_failed" ? "cache_write_failed" : toExplainErrorCode(e);
      failures[code] = (failures[code] ?? 0) + 1;
    }
  }

  const failed = Object.values(failures).reduce((a, b) => a + b, 0);
  const cached = list.filter((e) => existing.has(`${e.code}|${e.language}`)).length;
  console.log(
    `list: ${list.length}; already cached: ${cached}; attempted: ${todo.length}; written: ${written}; failed: ${failed}`,
  );
  if (failed > 0) console.log(`failure codes: ${JSON.stringify(failures)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "prefill failed");
  process.exit(1);
});
