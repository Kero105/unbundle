import { describe, expect, it } from "vitest";
import { compareLines, renderReport, summarize, type EvalLine } from "./eval-compare";

const line = (code: string | null, date: string | null, units: number, chargeCents: number): EvalLine => ({
  code,
  dateOfService: date,
  units,
  chargeCents,
});

const expected = [
  line("99214", "2026-10-02", 1, 22000),
  line("93000", "2026-10-02", 1, 5000),
  line(null, "2026-10-02", 2, 1500),
];

describe("compareLines", () => {
  it("scores a perfect extraction as fully correct", () => {
    const r = compareLines(expected, [...expected]);
    expect(r.matchedRows).toBe(3);
    expect(r.extraRows).toBe(0);
    expect(r.fieldCorrect).toEqual({ code: 3, date: 3, units: 3, charge: 3 });
    expect(r.mismatches).toEqual([]);
  });

  it("matches rows regardless of order", () => {
    const r = compareLines(expected, [expected[2], expected[0], expected[1]]);
    expect(r.matchedRows).toBe(3);
    expect(r.mismatches).toEqual([]);
  });

  it("reports the wrong field of a matched row", () => {
    const got = [line("99214", "2026-10-02", 1, 21000), expected[1], expected[2]];
    const r = compareLines(expected, got);
    expect(r.mismatches).toEqual([{ row: 1, fields: ["charge"], missing: false }]);
    expect(r.fieldCorrect.charge).toBe(2);
    expect(r.fieldCorrect.code).toBe(3);
  });

  it("treats a missing row as wrong in every field", () => {
    const r = compareLines(expected, [expected[0], expected[1]]);
    expect(r.matchedRows).toBe(2);
    expect(r.mismatches).toEqual([
      { row: 3, fields: ["code", "date", "units", "charge"], missing: true },
    ]);
  });

  it("counts extra extracted rows", () => {
    const r = compareLines(expected, [...expected, line("36415", "2026-10-02", 1, 900)]);
    expect(r.extraRows).toBe(1);
    expect(r.matchedRows).toBe(3);
  });

  it("does not match a row that agrees on fewer than two fields", () => {
    const r = compareLines([line("99214", "2026-10-02", 1, 22000)], [line("11111", "2026-11-11", 1, 1)]);
    expect(r.matchedRows).toBe(0);
    expect(r.extraRows).toBe(1);
  });

  it("normalizes code case and whitespace and handles null codes", () => {
    const r = compareLines([line("j1100", "2026-10-02", 1, 100)], [line(" J1100 ", "2026-10-02", 1, 100)]);
    expect(r.fieldCorrect.code).toBe(1);
    expect(compareLines([expected[2]], [expected[2]]).fieldCorrect.code).toBe(1);
  });

  it("handles empty input on either side", () => {
    expect(compareLines([], []).matchedRows).toBe(0);
    expect(compareLines(expected, []).mismatches).toHaveLength(3);
    expect(compareLines([], expected).extraRows).toBe(3);
  });

  it("pairs duplicate-looking rows one to one", () => {
    const dup = [line("99214", "2026-10-02", 1, 100), line("99214", "2026-10-02", 1, 100)];
    const r = compareLines(dup, [dup[0]]);
    expect(r.matchedRows).toBe(1);
    expect(r.mismatches).toHaveLength(1);
  });
});

describe("summarize and renderReport", () => {
  it("aggregates per-field accuracy over expected rows", () => {
    const a = compareLines(expected, [line("99214", "2026-10-02", 1, 1), expected[1], expected[2]]);
    const b = compareLines(expected, expected);
    const s = summarize([a, b]);
    expect(s.expectedRows).toBe(6);
    expect(s.perField.charge).toEqual({ correct: 5, total: 6, accuracy: 5 / 6 });
    expect(s.perField.code.accuracy).toBe(1);
  });

  it("reports n/a accuracy for no rows", () => {
    expect(summarize([]).perField.code.accuracy).toBeNull();
  });

  it("renders ids, row numbers and field names without any values", () => {
    const comparison = compareLines(expected, [line("99214", "2026-10-02", 1, 123456), expected[1]]);
    const md = renderReport(
      [
        { fixtureId: "bill-01", file: "bill-01.png", variant: "clean", comparison },
        { fixtureId: "bill-02", file: "bill-02.png", variant: "rotated", comparison: null, errorCode: "timeout" },
      ],
      { model: "m", date: "2026-10-10" },
    );
    expect(md).toContain("bill-01");
    expect(md).toContain("row 1: charge");
    expect(md).toContain("row 3 not found");
    expect(md).toContain("extraction failed (timeout)");
    expect(md).not.toContain("123456");
    expect(md).not.toContain("22000");
  });
});
