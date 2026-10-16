import { describe, expect, it } from "vitest";
import { DEFAULT_EXPLAIN_MODEL, readExplainConfig } from "./config";

describe("readExplainConfig", () => {
  it("defaults to mock", () => {
    expect(readExplainConfig({})).toEqual({ mode: "mock" });
  });

  it("reads anthropic mode with a key and optional model", () => {
    expect(readExplainConfig({ EXPLAIN_MODE: "anthropic", ANTHROPIC_API_KEY: "k", EXPLAIN_MODEL: "m" })).toEqual({
      mode: "anthropic",
      apiKey: "k",
      model: "m",
    });
  });

  it("falls back to the Haiku explain default, independent of EXTRACTION_MODEL", () => {
    const env = { EXPLAIN_MODE: "anthropic", ANTHROPIC_API_KEY: "k" };
    expect(DEFAULT_EXPLAIN_MODEL).toBe("claude-haiku-5-5");
    expect(readExplainConfig(env)).toMatchObject({ model: "claude-haiku-5-5" });
    // A blank EXPLAIN_MODEL counts as unset; EXTRACTION_MODEL is never consulted.
    expect(readExplainConfig({ ...env, EXPLAIN_MODEL: "  ", EXTRACTION_MODEL: "claude-sonnet-5-5" })).toMatchObject({
      model: "claude-haiku-5-5",
    });
  });

  it("fails closed on an unknown mode, a missing key, or the kill switch", () => {
    expect(() => readExplainConfig({ EXPLAIN_MODE: "live" })).toThrow("invalid_mode");
    expect(() => readExplainConfig({ EXPLAIN_MODE: "anthropic" })).toThrow("missing_api_key");
    expect(() => readExplainConfig({ EXTRACTION_ENABLED: "false" })).toThrow("disabled");
  });
});
