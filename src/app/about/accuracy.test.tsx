// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import accuracy from "@/lib/accuracy/accuracy.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { AccuracyTable, formatRatio, type AccuracyLabels } from "./accuracy-table";

const root = path.resolve(__dirname, "../../..");

afterEach(cleanup);

function labelsFor(about: typeof en.About): AccuracyLabels {
  const c = about.accuracy.columns;
  return {
    caption: about.accuracy.tableLabel,
    rule: c.rule,
    overall: about.accuracy.overall,
    na: about.accuracy.na,
    columns: {
      tp: { short: c.tp, full: c.tpFull },
      fp: { short: c.fp, full: c.fpFull },
      fn: { short: c.fn, full: c.fnFull },
      precision: { short: c.precision, full: c.precision },
      recall: { short: c.recall, full: c.recall },
    },
    ruleNames: about.accuracy.rules,
  };
}

describe("accuracy.json", () => {
  it("matches the table in docs/accuracy.md", () => {
    const md = fs.readFileSync(path.join(root, "docs/accuracy.md"), "utf8");
    const rows = [...md.matchAll(/^\| (?:\*\*)?([a-z_]+)(?:\*\*)? \| (\d+) \| (\d+) \| (\d+) \| (\S+) \| (\S+) \|$/gm)];
    const parsed = rows.map((m) => ({
      id: m[1],
      tp: Number(m[2]),
      fp: Number(m[3]),
      fn: Number(m[4]),
      precision: m[5],
      recall: m[6],
    }));
    const fromJson = [...accuracy.rules.map((r) => ({ ...r, id: r.ruleId })), { ...accuracy.overall, id: "overall" }].map(
      (r) => ({
        id: r.id,
        tp: r.tp,
        fp: r.fp,
        fn: r.fn,
        precision: formatRatio(r.precision, "en-US", "n/a"),
        recall: formatRatio(r.recall, "en-US", "n/a"),
      }),
    );
    expect(fromJson).toEqual(parsed);
  });

  it("counts the committed fixtures", () => {
    const names = fs.readdirSync(path.join(root, "fixtures/bills")).filter((n) => n.endsWith(".json"));
    expect(accuracy.fixtureCount).toBe(names.length);
    expect(accuracy.trapFixtureCount).toBe(names.filter((n) => /-(trap|clean)-/.test(n)).length);
  });

  it("has a translated name for every rule in both languages", () => {
    for (const about of [en.About, es.About]) {
      for (const r of accuracy.rules) {
        expect(about.accuracy.rules, r.ruleId).toHaveProperty(r.ruleId);
      }
    }
  });

  it("totals the rules", () => {
    const sum = (k: "tp" | "fp" | "fn") => accuracy.rules.reduce((n, r) => n + r[k], 0);
    expect(accuracy.overall.tp).toBe(sum("tp"));
    expect(accuracy.overall.fp).toBe(sum("fp"));
    expect(accuracy.overall.fn).toBe(sum("fn"));
  });
});

describe("AccuracyTable", () => {
  it.each([
    ["en", "en-US", en.About],
    ["es", "es-US", es.About],
  ] as const)("shows every number from accuracy.json in %s", (_name, locale, about) => {
    const { container } = render(
      <AccuracyTable data={accuracy} labels={labelsFor(about)} locale={locale} />,
    );
    const body = container.querySelectorAll("tbody tr");
    expect(body).toHaveLength(accuracy.rules.length);
    accuracy.rules.forEach((rule, i) => {
      const cells = within(body[i] as HTMLElement).getAllByRole("cell").map((c) => c.textContent);
      expect(cells).toEqual([
        String(rule.tp),
        String(rule.fp),
        String(rule.fn),
        formatRatio(rule.precision, locale, about.accuracy.na),
        formatRatio(rule.recall, locale, about.accuracy.na),
      ]);
    });
    const foot = within(container.querySelector("tfoot tr") as HTMLElement)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(foot[0]).toBe(String(accuracy.overall.tp));
  });

  it("shows n/a where a ratio has no denominator", () => {
    const data = {
      ...accuracy,
      rules: [{ ruleId: "math_error", tp: 0, fp: 0, fn: 0, precision: null, recall: null }],
    } as unknown as typeof accuracy;
    const { container } = render(<AccuracyTable data={data} labels={labelsFor(en.About)} locale="en-US" />);
    expect(container.querySelector("tbody")?.textContent).toContain("n/a");
  });
});

describe("accuracy caveat", () => {
  it("takes its counts from accuracy.json, not from the message text", () => {
    for (const about of [en.About, es.About]) {
      expect(about.accuracy.caveat).toContain("{fixtures}");
      expect(about.accuracy.caveat).toContain("{traps}");
    }
    expect(accuracy.fixtureCount).toBe(14);
    expect(accuracy.trapFixtureCount).toBe(5);
  });
});
