import { readExplainConfig } from "../explain/config";
import { resolvePrefillModel } from "../explain/prefill";
import { readExtractionConfig } from "../extraction/config";

/** The one place the intended model for each feature is written down. */
export const EXPECTED_MODELS = {
  extraction: "claude-haiku-5-5",
  explain: "claude-haiku-5-5",
} as const;

type Env = Record<string, string | undefined>;

/** The only variables this check reads. Keys and secrets are not among them. */
export const MODEL_ENV_KEYS = [
  "EXTRACTION_MODE",
  "EXTRACTION_MODEL",
  "EXTRACTION_ENABLED",
  "EXPLAIN_MODE",
  "EXPLAIN_MODEL",
] as const;

export type ModelRow = {
  feature: "extraction" | "explain" | "explain:prefill";
  /** mock, anthropic, disabled, invalid_mode, or none (prefill without a model). */
  mode: string;
  model: string | null;
  source: "env" | "default" | "flag" | "-";
  status: "ok" | "FAIL";
  reason: string | null;
};

const present = (value: string | undefined) => (value?.trim() ? true : false);

function codeOf(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "error";
}

type Resolved = { mode: string; model: string | null; source: ModelRow["source"] };

function resolve(read: () => { mode: string; model?: string }, explicit: boolean): Resolved {
  try {
    const config = read();
    if (config.mode !== "anthropic") return { mode: config.mode, model: null, source: "-" };
    return { mode: "anthropic", model: config.model ?? null, source: explicit ? "env" : "default" };
  } catch (error) {
    return { mode: codeOf(error), model: null, source: "-" };
  }
}

function judge(
  feature: "extraction" | "explain",
  resolved: Resolved,
  explicit: boolean,
  strict: boolean,
): Pick<ModelRow, "status" | "reason"> {
  if (resolved.mode === "invalid_mode" || resolved.mode === "error") {
    return { status: "FAIL", reason: "mode is not readable" };
  }
  if (resolved.mode === "anthropic" && resolved.model !== EXPECTED_MODELS[feature]) {
    return { status: "FAIL", reason: `expected ${EXPECTED_MODELS[feature]}` };
  }
  if (strict && !explicit) {
    const name = feature === "extraction" ? "EXTRACTION_MODEL" : "EXPLAIN_MODEL";
    return { status: "FAIL", reason: `${name} is not set explicitly` };
  }
  return { status: "ok", reason: null };
}

/**
 * Resolves the model each feature would use from `env`, with no network and no
 * secrets: only MODEL_ENV_KEYS are read, and a placeholder stands in for the API
 * key so the real config readers can run. Pure; the caller supplies env and argv.
 */
export function checkModels(env: Env, options: { strict?: boolean; argv?: string[] } = {}): ModelRow[] {
  const strict = options.strict === true || env.VERCEL_ENV === "production";
  const picked: Env = { ANTHROPIC_API_KEY: "placeholder" };
  for (const key of MODEL_ENV_KEYS) picked[key] = env[key];

  const extractionExplicit = present(picked.EXTRACTION_MODEL);
  const extraction = resolve(() => readExtractionConfig(picked), extractionExplicit);
  const explainExplicit = present(picked.EXPLAIN_MODEL);
  const explain = resolve(() => readExplainConfig(picked), explainExplicit);

  const prefillModel = resolvePrefillModel(options.argv ?? [], picked);
  const prefillFlag = (options.argv ?? []).includes("--model");
  const prefillWrong = prefillModel !== null && prefillModel !== EXPECTED_MODELS.explain;

  return [
    { feature: "extraction", ...extraction, ...judge("extraction", extraction, extractionExplicit, strict) },
    { feature: "explain", ...explain, ...judge("explain", explain, explainExplicit, strict) },
    {
      feature: "explain:prefill",
      mode: prefillModel === null ? "none" : "anthropic",
      model: prefillModel,
      source: prefillModel === null ? "-" : prefillFlag ? "flag" : "env",
      status: prefillWrong ? "FAIL" : "ok",
      reason: prefillWrong ? `expected ${EXPECTED_MODELS.explain}` : null,
    },
  ];
}

export function modelsPass(rows: readonly ModelRow[]): boolean {
  return rows.every((row) => row.status === "ok");
}

export function renderModelTable(rows: readonly ModelRow[]): string {
  const header = ["feature", "mode", "model", "source", "status"];
  const body = rows.map((r) => [
    r.feature,
    r.mode,
    r.model ?? "-",
    r.source,
    r.reason ? `${r.status} (${r.reason})` : r.status,
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...body.map((row) => row[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...body.map(line)].join("\n");
}
