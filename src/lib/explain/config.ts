import { DEFAULT_EXTRACTION_MODEL } from "@/lib/extraction/config";
import { ExplainError } from "./types";

export type ExplainConfig =
  | { mode: "mock" }
  | { mode: "anthropic"; apiKey: string; model: string };

type Env = Record<string, string | undefined>;

const ON = new Set(["true", "1", "yes", "on"]);

/**
 * EXPLAIN_MODE=mock|anthropic, default mock. Fails closed like extraction:
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
    model: env.EXPLAIN_MODEL?.trim() || DEFAULT_EXTRACTION_MODEL,
  };
}
