import { describe, expect, it } from "vitest";
import { describeIssues, validateServerEnv } from "./validate";

const BASE = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test",
};
const PROD = { production: true };
const DEV = { production: false };

describe("validateServerEnv", () => {
  it("accepts mock mode outside production", () => {
    expect(validateServerEnv(BASE, DEV)).toEqual({ ok: true, extractionMode: "mock" });
  });

  it("accepts anthropic mode with a key in production", () => {
    const env = { ...BASE, EXTRACTION_MODE: "anthropic", ANTHROPIC_API_KEY: "k" };
    expect(validateServerEnv(env, PROD)).toEqual({ ok: true, extractionMode: "anthropic" });
  });

  it("is case and whitespace tolerant for the mode", () => {
    const env = { ...BASE, EXTRACTION_MODE: " Anthropic ", ANTHROPIC_API_KEY: "k" };
    expect(validateServerEnv(env, PROD).ok).toBe(true);
  });

  it("fails closed in production when the mode is unset", () => {
    const result = validateServerEnv(BASE, PROD);
    expect(result).toEqual({
      ok: false,
      issues: [{ name: "EXTRACTION_MODE", problem: "mock_in_production" }],
    });
  });

  it("fails closed in production when the mode is mock", () => {
    const result = validateServerEnv({ ...BASE, EXTRACTION_MODE: "mock" }, PROD);
    expect(result.ok).toBe(false);
  });

  it("allows mock in production only with the explicit opt-in", () => {
    const env = { ...BASE, EXTRACTION_MODE: "mock", ALLOW_MOCK_EXTRACTION_IN_PRODUCTION: "true" };
    expect(validateServerEnv(env, PROD).ok).toBe(true);
    expect(
      validateServerEnv({ ...env, ALLOW_MOCK_EXTRACTION_IN_PRODUCTION: "nope" }, PROD).ok,
    ).toBe(false);
  });

  it("requires the Anthropic key in anthropic mode", () => {
    const result = validateServerEnv({ ...BASE, EXTRACTION_MODE: "anthropic", ANTHROPIC_API_KEY: "  " }, DEV);
    expect(result).toEqual({ ok: false, issues: [{ name: "ANTHROPIC_API_KEY", problem: "missing" }] });
  });

  it("rejects an unknown mode in every environment", () => {
    const result = validateServerEnv({ ...BASE, EXTRACTION_MODE: "antropic" }, DEV);
    expect(result).toEqual({ ok: false, issues: [{ name: "EXTRACTION_MODE", problem: "invalid" }] });
  });

  it("requires the Supabase variables and a plausible URL", () => {
    const missing = validateServerEnv({}, DEV);
    expect(missing).toEqual({
      ok: false,
      issues: [
        { name: "NEXT_PUBLIC_SUPABASE_URL", problem: "missing" },
        { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", problem: "missing" },
      ],
    });
    const bad = validateServerEnv({ ...BASE, NEXT_PUBLIC_SUPABASE_URL: "not a url" }, DEV);
    expect(bad).toEqual({ ok: false, issues: [{ name: "NEXT_PUBLIC_SUPABASE_URL", problem: "invalid" }] });
  });

  it("describes issues by name only, never by value", () => {
    const env = { ...BASE, EXTRACTION_MODE: "anthropic", ANTHROPIC_API_KEY: "" , NEXT_PUBLIC_SUPABASE_ANON_KEY: "secret-value" };
    const result = validateServerEnv(env, PROD);
    if (result.ok) throw new Error("expected failure");
    const text = describeIssues(result.issues);
    expect(text).toBe("ANTHROPIC_API_KEY: missing");
    expect(text).not.toContain("secret-value");
  });
});
