import { describe, expect, it } from "vitest";
import { checkModels, EXPECTED_MODELS, modelsPass, renderModelTable } from "./check-models";

const HAIKU = "claude-haiku-5-5";
const live = { EXTRACTION_MODE: "anthropic", EXPLAIN_MODE: "anthropic" };
const row = (rows: ReturnType<typeof checkModels>, feature: string) => rows.find((r) => r.feature === feature)!;

describe("checkModels", () => {
  it("expects Haiku for both features", () => {
    expect(EXPECTED_MODELS).toEqual({ extraction: HAIKU, explain: HAIKU });
  });

  it("passes with explicit Haiku values", () => {
    const rows = checkModels({ ...live, EXTRACTION_MODEL: HAIKU, EXPLAIN_MODEL: HAIKU });
    expect(modelsPass(rows)).toBe(true);
    expect(row(rows, "extraction")).toMatchObject({ mode: "anthropic", model: HAIKU, source: "env", status: "ok" });
  });

  it("reports the default as the source, and still passes outside strict mode", () => {
    const rows = checkModels(live);
    expect(row(rows, "extraction")).toMatchObject({ model: HAIKU, source: "default", status: "ok" });
    expect(modelsPass(rows)).toBe(true);
  });

  it("treats a blank model as unset", () => {
    const rows = checkModels({ ...live, EXTRACTION_MODEL: "  ", EXPLAIN_MODEL: "" });
    expect(row(rows, "extraction").source).toBe("default");
    expect(row(rows, "explain").source).toBe("default");
  });

  it("fails when a live feature resolves to another model", () => {
    const rows = checkModels({ ...live, EXTRACTION_MODEL: "claude-sonnet-5-5", EXPLAIN_MODEL: HAIKU });
    expect(row(rows, "extraction")).toMatchObject({ model: "claude-sonnet-5-5", status: "FAIL" });
    expect(row(rows, "explain").status).toBe("ok");
    expect(modelsPass(rows)).toBe(false);
  });

  it("does not fail a mock feature for its model, and shows no model", () => {
    const rows = checkModels({ EXTRACTION_MODEL: "claude-sonnet-5-5" });
    expect(row(rows, "extraction")).toMatchObject({ mode: "mock", model: null, status: "ok" });
  });

  it("strict mode requires explicit models", () => {
    const rows = checkModels({ ...live, EXTRACTION_MODEL: HAIKU }, { strict: true });
    expect(row(rows, "extraction").status).toBe("ok");
    expect(row(rows, "explain")).toMatchObject({ status: "FAIL", reason: "EXPLAIN_MODEL is not set explicitly" });
  });

  it("treats VERCEL_ENV=production as strict, and other values as not", () => {
    expect(modelsPass(checkModels({ ...live, VERCEL_ENV: "production" }))).toBe(false);
    expect(modelsPass(checkModels({ ...live, VERCEL_ENV: "preview" }))).toBe(true);
  });

  it("fails on an invalid mode instead of passing it", () => {
    const rows = checkModels({ EXTRACTION_MODE: "antropic" });
    expect(row(rows, "extraction")).toMatchObject({ mode: "invalid_mode", status: "FAIL" });
  });

  it("shows the kill switch as disabled, not as a model", () => {
    const rows = checkModels({ ...live, EXTRACTION_ENABLED: "false" });
    expect(row(rows, "extraction")).toMatchObject({ mode: "disabled", model: null, status: "ok" });
  });

  it("works without an API key: the key is never read", () => {
    const rows = checkModels({ ...live, ANTHROPIC_API_KEY: "should-not-appear" });
    expect(JSON.stringify(rows)).not.toContain("should-not-appear");
    expect(JSON.stringify(rows)).not.toContain("placeholder");
  });

  it("covers explain:prefill: none, flag, env, and a wrong model", () => {
    expect(row(checkModels({}), "explain:prefill")).toMatchObject({ mode: "none", model: null, status: "ok" });
    expect(row(checkModels({}, { argv: ["--model", HAIKU] }), "explain:prefill")).toMatchObject({
      model: HAIKU,
      source: "flag",
      status: "ok",
    });
    expect(row(checkModels({ EXPLAIN_MODEL: HAIKU }), "explain:prefill")).toMatchObject({ source: "env" });
    expect(row(checkModels({}, { argv: ["--model", "claude-sonnet-5-5"] }), "explain:prefill").status).toBe("FAIL");
  });

  it("renders a table with one line per feature", () => {
    const out = renderModelTable(checkModels({ ...live, EXTRACTION_MODEL: HAIKU }));
    expect(out.split("\n")).toHaveLength(5);
    expect(out).toContain("extraction");
  });
});
