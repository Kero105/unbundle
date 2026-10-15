/**
 * Pure comparison of extracted line items against a ground-truth manifest.
 * Used by scripts/extraction-eval.ts. Output carries fixture ids, row numbers
 * and field names only: never bill text or values.
 */

export const EVAL_FIELDS = ["code", "date", "units", "charge"] as const;
export type EvalField = (typeof EVAL_FIELDS)[number];

export type EvalLine = {
  code: string | null;
  dateOfService: string | null;
  units: number;
  chargeCents: number;
};

export type RowMismatch = {
  /** 1-based position in the expected (ground truth) list. */
  row: number;
  /** Fields that differ, or every field when the row was not found. */
  fields: EvalField[];
  missing: boolean;
};

export type FixtureComparison = {
  expectedRows: number;
  extractedRows: number;
  matchedRows: number;
  extraRows: number;
  fieldCorrect: Record<EvalField, number>;
  mismatches: RowMismatch[];
};

/** A pair must agree on at least this many of the four fields to count as the same row. */
const MIN_FIELDS_TO_MATCH = 2;

const norm = (code: string | null) => (code === null ? null : code.trim().toUpperCase() || null);

function fieldEquals(field: EvalField, a: EvalLine, b: EvalLine): boolean {
  switch (field) {
    case "code":
      return norm(a.code) === norm(b.code);
    case "date":
      return a.dateOfService === b.dateOfService;
    case "units":
      return a.units === b.units;
    case "charge":
      return a.chargeCents === b.chargeCents;
  }
}

function agreeing(a: EvalLine, b: EvalLine): EvalField[] {
  return EVAL_FIELDS.filter((f) => fieldEquals(f, a, b));
}

export function compareLines(
  expected: readonly EvalLine[],
  extracted: readonly EvalLine[],
): FixtureComparison {
  type Pair = { e: number; x: number; score: number };
  const pairs: Pair[] = [];
  expected.forEach((exp, e) =>
    extracted.forEach((got, x) => {
      const score = agreeing(exp, got).length;
      if (score >= MIN_FIELDS_TO_MATCH) pairs.push({ e, x, score });
    }),
  );
  // Best agreement first; ties prefer rows that sit in the same position.
  pairs.sort((p, q) => q.score - p.score || Math.abs(p.e - p.x) - Math.abs(q.e - q.x) || p.e - q.e);

  const matchOf = new Map<number, number>();
  const usedExtracted = new Set<number>();
  for (const pair of pairs) {
    if (matchOf.has(pair.e) || usedExtracted.has(pair.x)) continue;
    matchOf.set(pair.e, pair.x);
    usedExtracted.add(pair.x);
  }

  const fieldCorrect: Record<EvalField, number> = { code: 0, date: 0, units: 0, charge: 0 };
  const mismatches: RowMismatch[] = [];

  expected.forEach((exp, e) => {
    const x = matchOf.get(e);
    if (x === undefined) {
      mismatches.push({ row: e + 1, fields: [...EVAL_FIELDS], missing: true });
      return;
    }
    const wrong: EvalField[] = [];
    for (const field of EVAL_FIELDS) {
      if (fieldEquals(field, exp, extracted[x])) fieldCorrect[field] += 1;
      else wrong.push(field);
    }
    if (wrong.length > 0) mismatches.push({ row: e + 1, fields: wrong, missing: false });
  });

  return {
    expectedRows: expected.length,
    extractedRows: extracted.length,
    matchedRows: matchOf.size,
    extraRows: extracted.length - usedExtracted.size,
    fieldCorrect,
    mismatches,
  };
}

export type FieldAccuracy = { correct: number; total: number; accuracy: number | null };

export type EvalSummary = {
  fixtures: number;
  expectedRows: number;
  matchedRows: number;
  extraRows: number;
  perField: Record<EvalField, FieldAccuracy>;
};

const ratio = (n: number, d: number) => (d === 0 ? null : n / d);

export function summarize(results: readonly FixtureComparison[]): EvalSummary {
  const expectedRows = results.reduce((a, r) => a + r.expectedRows, 0);
  const perField = Object.fromEntries(
    EVAL_FIELDS.map((f) => {
      const correct = results.reduce((a, r) => a + r.fieldCorrect[f], 0);
      return [f, { correct, total: expectedRows, accuracy: ratio(correct, expectedRows) }];
    }),
  ) as Record<EvalField, FieldAccuracy>;
  return {
    fixtures: results.length,
    expectedRows,
    matchedRows: results.reduce((a, r) => a + r.matchedRows, 0),
    extraRows: results.reduce((a, r) => a + r.extraRows, 0),
    perField,
  };
}

export const pct = (value: number | null) => (value === null ? "n/a" : `${(value * 100).toFixed(1)}%`);

export type ReportEntry = {
  fixtureId: string;
  file: string;
  variant: string;
  /**
   * Scored result. For a failed extraction pass compareLines(expected, []) so
   * every expected row counts as wrong; null is only for an entry with no
   * ground truth and is left out of the accuracy numbers.
   */
  comparison: FixtureComparison | null;
  /** Opaque error code when the extractor failed, never a message. */
  errorCode?: string;
  /** Source-box counts for the rows the extractor returned. Absent when it failed. */
  boxes?: BoxCoverage;
};

export type BoxCoverage = { rows: number; withBox: number };

/** Counts rows that came back with a position on the page. Coverage, not accuracy. */
export function boxCoverage(items: readonly { sourceBox: unknown }[]): BoxCoverage {
  return { rows: items.length, withBox: items.filter((i) => i.sourceBox !== null && i.sourceBox !== undefined).length };
}

function sumCoverage(entries: readonly ReportEntry[]): BoxCoverage {
  return entries.reduce(
    (acc, e) => ({ rows: acc.rows + (e.boxes?.rows ?? 0), withBox: acc.withBox + (e.boxes?.withBox ?? 0) }),
    { rows: 0, withBox: 0 },
  );
}

/** Markdown for docs/extraction-eval.md. Contains ids, counts and field names only. */
export function renderReport(entries: readonly ReportEntry[], meta: { model: string; date: string }): string {
  // Failed extractions are scored too (all rows missing), so they pull accuracy down.
  const ok = entries.filter((e) => e.comparison !== null);
  const failed = entries.filter((e) => e.errorCode).length;
  const overall = summarize(ok.map((e) => e.comparison!));
  const lines: string[] = [];
  lines.push("# Extraction evaluation", "");
  lines.push(
    `Real extractor run on synthetic fixture images (model \`${meta.model}\`, ${meta.date}).`,
    "Ground truth is `fixtures/images/manifest.json`. Rows are matched when at least two of code,",
    "date, units and charge agree; a field is correct when it equals the ground truth exactly.",
    "This report lists fixture ids, row numbers and field names only, never bill text.",
    "",
  );
  lines.push(
    `Images: ${entries.length}, extraction failed: ${failed}. Rows expected: ${overall.expectedRows}, ` +
      `matched: ${overall.matchedRows}, extra rows: ${overall.extraRows}.`,
    "",
  );
  lines.push("## Accuracy by field", "", "| Field | Correct | Total | Accuracy |", "|---|---:|---:|---:|");
  for (const f of EVAL_FIELDS) {
    const a = overall.perField[f];
    lines.push(`| ${f} | ${a.correct} | ${a.total} | ${pct(a.accuracy)} |`);
  }

  const variants = [...new Set(ok.map((e) => e.variant))].sort();
  if (variants.length > 1) {
    lines.push("", "## Accuracy by variant", "", `| Variant | Images | ${EVAL_FIELDS.join(" | ")} |`);
    lines.push(`|---|---:|${EVAL_FIELDS.map(() => "---:").join("|")}|`);
    for (const v of variants) {
      const group = ok.filter((e) => e.variant === v);
      const s = summarize(group.map((e) => e.comparison!));
      lines.push(
        `| ${v} | ${group.length} | ${EVAL_FIELDS.map((f) => pct(s.perField[f].accuracy)).join(" | ")} |`,
      );
    }
  }

  const measured = entries.filter((e) => e.boxes !== undefined);
  if (measured.length > 0) {
    const share = (c: BoxCoverage) => pct(c.rows === 0 ? null : c.withBox / c.rows);
    const total = sumCoverage(measured);
    lines.push(
      "",
      "## Source box coverage",
      "",
      "Share of returned rows that came back with a non-null sourceBox (a position on the page).",
      "This measures presence only: the fixtures have no ground-truth boxes, so placement is not scored.",
      "",
      `Overall: ${total.withBox} of ${total.rows} rows (${share(total)}).`,
    );
    const boxVariants = [...new Set(measured.map((e) => e.variant))].sort();
    if (boxVariants.length > 1) {
      lines.push("", "| Variant | Rows | With box | Coverage |", "|---|---:|---:|---:|");
      for (const v of boxVariants) {
        const c = sumCoverage(measured.filter((e) => e.variant === v));
        lines.push(`| ${v} | ${c.rows} | ${c.withBox} | ${share(c)} |`);
      }
    }
  }

  lines.push("", "## Mismatches", "");
  const withIssues = entries.filter(
    (e) => e.errorCode || (e.comparison && (e.comparison.mismatches.length > 0 || e.comparison.extraRows > 0)),
  );
  if (withIssues.length === 0) {
    lines.push("None.");
  } else {
    for (const e of withIssues) {
      if (e.errorCode) {
        lines.push(`- \`${e.file}\` (${e.fixtureId}, ${e.variant}): extraction failed (${e.errorCode})`);
        continue;
      }
      const c = e.comparison!;
      const parts = c.mismatches.map((m) =>
        m.missing ? `row ${m.row} not found` : `row ${m.row}: ${m.fields.join(", ")}`,
      );
      if (c.extraRows > 0) parts.push(`${c.extraRows} extra row${c.extraRows === 1 ? "" : "s"}`);
      lines.push(`- \`${e.file}\` (${e.fixtureId}, ${e.variant}): ${parts.join("; ")}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
