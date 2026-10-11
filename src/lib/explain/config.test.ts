import { describe, expect, it } from "vitest";
import { readExplainConfig } from "./config";

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

  it("fails closed on an unknown mode, a missing key, or the kill switch", () => {
    expect(() => readExplainConfig({ EXPLAIN_MODE: "live" })).toThrow("invalid_mode");
    expect(() => readExplainConfig({ EXPLAIN_MODE: "anthropic" })).toThrow("missing_api_key");
    expect(() => readExplainConfig({ EXTRACTION_ENABLED: "false" })).toThrow("disabled");
  });
});
