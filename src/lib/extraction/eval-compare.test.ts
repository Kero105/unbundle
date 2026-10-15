import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { boxCoverage, compareLines, EVAL_FIELDS, renderReport, summarize, type EvalLine } from "./eval-compare";

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

  it("counts a failed extraction as every row missing instead of leaving it out", () => {
    const perfect = compareLines(expected, expected);
    const failedRun = compareLines(expected, []);
    const md = renderReport(
      [
        { fixtureId: "a", file: "a.png", variant: "clean", comparison: perfect },
        { fixtureId: "b", file: "b.png", variant: "clean", comparison: failedRun, errorCode: "timeout" },
      ],
      { model: "m", date: "2026-10-10" },
    );
    expect(summarize([perfect, failedRun]).perField.charge.accuracy).toBe(0.5);
    expect(md).toContain("| charge | 3 | 6 | 50.0% |");
    expect(md).toContain("extraction failed: 1");
    expect(md).toContain("extraction failed (timeout)");
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

describe("scoring the real manifest", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../../fixtures/images/manifest.json"), "utf8"),
  ) as { entries: { file: string; fixtureId: string; variant: string; expected: { lineItems: EvalLine[] } }[] };
  const rows = (e: (typeof manifest.entries)[number]): EvalLine[] =>
    e.expected.lineItems.map((l) => ({
      code: l.code,
      dateOfService: l.dateOfService,
      units: l.units,
      chargeCents: l.chargeCents,
    }));

  it("has fixtures to score", () => {
    expect(manifest.entries.length).toBeGreaterThan(0);
  });

  it("reports 100% on every field when the output equals the ground truth", () => {
    const comparisons = manifest.entries.map((e) => compareLines(rows(e), rows(e)));
    for (const c of comparisons) {
      expect(c.mismatches).toEqual([]);
      expect(c.extraRows).toBe(0);
    }
    const s = summarize(comparisons);
    for (const f of EVAL_FIELDS) expect(s.perField[f].accuracy).toBe(1);

    const md = renderReport(
      manifest.entries.map((e, i) => ({ fixtureId: e.fixtureId, file: e.file, variant: e.variant, comparison: comparisons[i] })),
      { model: "m", date: "2026-10-10" },
    );
    expect(md).toContain("## Mismatches\n\nNone.");
    expect(md).toContain("100.0%");
  });

  it("reports a wrong code, wrong cents and a missing line as diffs on every fixture", () => {
    for (const e of manifest.entries) {
      const truth = rows(e);
      if (truth.length < 3) continue;
      const got = truth.map((r) => ({ ...r }));
      got[0].code = "00000";
      got[1].chargeCents += 1;
      got.splice(2, 1);

      const c = compareLines(truth, got);
      // Rows can match out of position when lines are identical, so check by field totals.
      expect(c.fieldCorrect.code).toBe(truth.length - 2); // wrong code + missing line
      expect(c.fieldCorrect.charge).toBe(truth.length - 2); // wrong cents + missing line
      expect(c.mismatches.length).toBeGreaterThanOrEqual(1);
      expect(c.mismatches.some((m) => m.missing)).toBe(true);
      const md = renderReport(
        [{ fixtureId: e.fixtureId, file: e.file, variant: e.variant, comparison: c }],
        { model: "m", date: "2026-10-10" },
      );
      expect(md).not.toContain("## Mismatches\n\nNone.");
    }
  });

  it("counts rows with a source box", () => {
    expect(boxCoverage([])).toEqual({ rows: 0, withBox: 0 });
    const box = { x: 0.1, y: 0.2, width: 0.8, height: 0.05 };
    expect(boxCoverage([{ sourceBox: box }, { sourceBox: null }, { sourceBox: box }])).toEqual({ rows: 3, withBox: 2 });
  });

  it("reports box coverage overall and by variant, and leaves failures out", () => {
    const perfect = compareLines(expected, expected);
    const md = renderReport(
      [
        { fixtureId: "a", file: "a.png", variant: "clean", comparison: perfect, boxes: { rows: 4, withBox: 4 } },
        { fixtureId: "b", file: "b.png", variant: "rotated", comparison: perfect, boxes: { rows: 4, withBox: 1 } },
        { fixtureId: "c", file: "c.png", variant: "clean", comparison: compareLines(expected, []), errorCode: "timeout" },
      ],
      { model: "m", date: "2026-10-10" },
    );
    expect(md).toContain("## Source box coverage");
    expect(md).toContain("Overall: 5 of 8 rows (62.5%).");
    expect(md).toContain("| rotated | 4 | 1 | 25.0% |");
  });

  it("omits the box section when no entry measured boxes", () => {
    const md = renderReport(
      [{ fixtureId: "a", file: "a.png", variant: "clean", comparison: compareLines(expected, expected) }],
      { model: "m", date: "2026-10-10" },
    );
    expect(md).not.toContain("Source box coverage");
  });
});
