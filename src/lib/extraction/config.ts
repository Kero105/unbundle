import { ExtractionError } from "./errors";

export const DEFAULT_EXTRACTION_MODEL = "claude-sonnet-5-5";

export type ExtractionConfig =
  | { mode: "mock" }
  | { mode: "anthropic"; apiKey: string; model: string };

type Env = Record<string, string | undefined>;

const ON = new Set(["true", "1", "yes", "on"]);

/**
 * Reads extraction settings from the environment (server only).
 *
 * Fails closed everywhere:
 *  - EXTRACTION_ENABLED unset means on; any value that is not clearly "on"
 *    (including "false", "0", a typo) is the kill switch.
 *  - EXTRACTION_MODE unset means mock; an unknown value throws rather than
 *    silently falling back to something else.
 *  - anthropic mode without ANTHROPIC_API_KEY throws.
 */
export function readExtractionConfig(env: Env = process.env): ExtractionConfig {
  const enabled = env.EXTRACTION_ENABLED?.trim().toLowerCase();
  if (enabled !== undefined && enabled !== "" && !ON.has(enabled)) {
    throw new ExtractionError("disabled");
  }

  const mode = (env.EXTRACTION_MODE?.trim().toLowerCase() || "mock") as string;
  if (mode === "mock") return { mode: "mock" };
  if (mode !== "anthropic") throw new ExtractionError("invalid_mode");

  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ExtractionError("missing_api_key");

  return {
    mode: "anthropic",
    apiKey,
    model: env.EXTRACTION_MODEL?.trim() || DEFAULT_EXTRACTION_MODEL,
  };
}
