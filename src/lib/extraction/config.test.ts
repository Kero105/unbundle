import { describe, expect, it } from "vitest";
import { DEFAULT_EXTRACTION_MODEL, readExtractionConfig } from "./config";
import { ExtractionError } from "./errors";

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ExtractionError ? e.code : "other";
  }
  return null;
};

describe("readExtractionConfig", () => {
  it("defaults to mock with nothing set", () => {
    expect(readExtractionConfig({})).toEqual({ mode: "mock" });
  });

  it("selects mock and anthropic explicitly (case-insensitive)", () => {
    expect(readExtractionConfig({ EXTRACTION_MODE: "MOCK" })).toEqual({ mode: "mock" });
    expect(readExtractionConfig({ EXTRACTION_MODE: "anthropic", ANTHROPIC_API_KEY: "k" })).toEqual({
      mode: "anthropic",
      apiKey: "k",
      model: DEFAULT_EXTRACTION_MODEL,
    });
  });

  it("defaults to Haiku, and a blank EXTRACTION_MODEL counts as unset", () => {
    expect(DEFAULT_EXTRACTION_MODEL).toBe("claude-haiku-5-5");
    const env = { EXTRACTION_MODE: "anthropic", ANTHROPIC_API_KEY: "k" };
    expect(readExtractionConfig(env)).toMatchObject({ model: "claude-haiku-5-5" });
    expect(readExtractionConfig({ ...env, EXTRACTION_MODEL: "  " })).toMatchObject({ model: "claude-haiku-5-5" });
  });

  it("allows a model override", () => {
    const config = readExtractionConfig({
      EXTRACTION_MODE: "anthropic",
      ANTHROPIC_API_KEY: "k",
      EXTRACTION_MODEL: "claude-opus-5-5",
    });
    expect(config).toMatchObject({ model: "claude-opus-5-5" });
  });

  it("fails closed when anthropic mode has no key", () => {
    expect(codeOf(() => readExtractionConfig({ EXTRACTION_MODE: "anthropic" }))).toBe("missing_api_key");
    expect(
      codeOf(() => readExtractionConfig({ EXTRACTION_MODE: "anthropic", ANTHROPIC_API_KEY: "  " })),
    ).toBe("missing_api_key");
  });

  it("rejects an unknown mode instead of falling back", () => {
    expect(codeOf(() => readExtractionConfig({ EXTRACTION_MODE: "antropic" }))).toBe("invalid_mode");
  });

  it("does not require a key in mock mode", () => {
    expect(codeOf(() => readExtractionConfig({ EXTRACTION_MODE: "mock" }))).toBeNull();
  });

  it.each(["false", "0", "off", "no", "disabled", "flase"])(
    "kill switch: EXTRACTION_ENABLED=%s disables extraction",
    (value) => {
      expect(codeOf(() => readExtractionConfig({ EXTRACTION_ENABLED: value }))).toBe("disabled");
    },
  );

  it.each([undefined, "", "true", "1", "ON"])("EXTRACTION_ENABLED=%s leaves it enabled", (value) => {
    expect(codeOf(() => readExtractionConfig({ EXTRACTION_ENABLED: value }))).toBeNull();
  });

  it("checks the kill switch before the key", () => {
    expect(
      codeOf(() => readExtractionConfig({ EXTRACTION_ENABLED: "false", EXTRACTION_MODE: "anthropic" })),
    ).toBe("disabled");
  });
});
