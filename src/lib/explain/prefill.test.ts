import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePrefillList, resolvePrefillModel } from "./prefill";

describe("parsePrefillList", () => {
  it("normalizes codes and drops duplicates", () => {
    expect(
      parsePrefillList([
        { code: "j1100", language: "en" },
        { code: "J1100", language: "en" },
        { code: "J1100", language: "es" },
      ]),
    ).toEqual([
      { code: "J1100", language: "en" },
      { code: "J1100", language: "es" },
    ]);
  });

  it("rejects an invalid code, an unknown language and extra fields", () => {
    expect(() => parsePrefillList([{ code: "9921", language: "en" }])).toThrow();
    expect(() => parsePrefillList([{ code: "99213", language: "fr" }])).toThrow();
    expect(() => parsePrefillList([{ code: "99213", language: "en", note: "x" }])).toThrow();
    expect(() => parsePrefillList({})).toThrow();
  });

  it("accepts the committed reviewed list, with both languages for every code", () => {
    const file = path.resolve(__dirname, "../../../scripts/data/explain-codes.json");
    const list = parsePrefillList(JSON.parse(fs.readFileSync(file, "utf8")));
    expect(list.length).toBeGreaterThan(0);
    const byCode = new Map<string, Set<string>>();
    for (const e of list) byCode.set(e.code, (byCode.get(e.code) ?? new Set()).add(e.language));
    for (const langs of byCode.values()) expect([...langs].sort()).toEqual(["en", "es"]);
  });
});

describe("resolvePrefillModel", () => {
  it("has no default: neither flag nor env means no model", () => {
    expect(resolvePrefillModel([], {})).toBeNull();
    expect(resolvePrefillModel([], { EXPLAIN_MODEL: "  " })).toBeNull();
  });

  it("reads --model, which wins over EXPLAIN_MODEL", () => {
    expect(resolvePrefillModel(["--model", "claude-haiku-5-5"], {})).toBe("claude-haiku-5-5");
    expect(resolvePrefillModel(["--model", "a"], { EXPLAIN_MODEL: "b" })).toBe("a");
    expect(resolvePrefillModel([], { EXPLAIN_MODEL: " b " })).toBe("b");
  });

  it("treats a --model with no value as missing rather than falling back", () => {
    expect(resolvePrefillModel(["--model"], { EXPLAIN_MODEL: "b" })).toBeNull();
    expect(resolvePrefillModel(["--model", "--yes"], { EXPLAIN_MODEL: "b" })).toBeNull();
  });
});
