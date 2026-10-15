import { ExplainError } from "./types";

/**
 * Fallback for live "What is this?" explanations when EXPLAIN_MODEL is unset.
 * Deliberately its own constant, not the extraction default: explanations are
 * short, cached and high-volume, so they run on the cheaper model. Changing the
 * extraction model must never change explanation spend.
 */
export const DEFAULT_EXPLAIN_MODEL = "claude-haiku-5-5";

export type ExplainConfig =
  | { mode: "mock" }
  | { mode: "anthropic"; apiKey: string; model: string };

type Env = Record<string, string | undefined>;

const ON = new Set(["true", "1", "yes", "on"]);

/**
 * EXPLAIN_MODE=mock|anthropic, default mock. EXPLAIN_MODEL overrides the model;
 * unset, it is DEFAULT_EXPLAIN_MODEL. Fails closed like extraction:
 * the EXTRACTION_ENABLED kill switch also turns explanations off, an unknown
 * mode throws, and anthropic mode needs ANTHROPIC_API_KEY.
 */
export function readExplainConfig(env: Env = process.env): ExplainConfig {
  const enabled = env.EXTRACTION_ENABLED?.trim().toLowerCase();
  if (enabled !== undefined && enabled !== "" && !ON.has(enabled)) throw new ExplainError("disabled");

  const mode = env.EXPLAIN_MODE?.trim().toLowerCase() || "mock";
  if (mode === "mock") return { mode: "mock" };
  if (mode !== "anthropic") throw new ExplainError("invalid_mode");

  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ExplainError("missing_api_key");
  return {
    mode: "anthropic",
    apiKey,
    model: env.EXPLAIN_MODEL?.trim() || DEFAULT_EXPLAIN_MODEL,
  };
}
