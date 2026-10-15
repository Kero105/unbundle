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
 *   npm run explain:prefill -- --model <model-id> [--yes] [--limit N]
 *
 * Needs ANTHROPIC_API_KEY in .env.local. There is no default model: pass
 * --model or set EXPLAIN_MODEL. The script prints the model and the number of
 * calls, then asks before making any; --yes skips the question (and is
 * required when there is no terminal).
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { AnthropicExplainer } from "../src/lib/explain/anthropic-explainer";
import { readExplainConfig } from "../src/lib/explain/config";
import { parsePrefillList, resolvePrefillModel } from "../src/lib/explain/prefill";
import { toExplainErrorCode } from "../src/lib/explain/types";
import { ExplanationTextSchema } from "../src/lib/explain/validate";
import { serviceClient } from "./lib/env.mjs";

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

  const model = resolvePrefillModel(process.argv, process.env);
  if (!model) {
    console.error("No model given. Pass --model <model-id> or set EXPLAIN_MODEL; there is no default for this script.");
    process.exit(1);
  }

  // Same fail-closed config as the app, but this script always wants the model.
  const config = readExplainConfig({ ...process.env, EXPLAIN_MODE: "anthropic", EXPLAIN_MODEL: model });
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

  console.log(`model: ${config.model}`);
  console.log(`estimated model calls: ${todo.length} (${list.length - todo.length} already cached)`);
  if (todo.length === 0) return;
  if (!process.argv.includes("--yes")) {
    if (!process.stdin.isTTY) {
      console.error("No terminal to confirm on. Re-run with --yes to proceed.");
      process.exit(1);
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`Make ${todo.length} calls to ${config.model}? [y/N] `)).trim().toLowerCase();
    rl.close();
    if (answer !== "y" && answer !== "yes") {
      console.log("Cancelled; no calls made.");
      return;
    }
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
