import accuracy from "@/lib/accuracy/accuracy.json";

export type AccuracyData = typeof accuracy;

export interface AccuracyLabels {
  caption: string;
  rule: string;
  overall: string;
  na: string;
  columns: Record<"tp" | "fp" | "fn" | "precision" | "recall", { short: string; full: string }>;
  ruleNames: Record<string, string>;
}

export function formatRatio(value: number | null, locale: string, na: string): string {
  if (value === null) return na;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

const COLUMNS = ["tp", "fp", "fn", "precision", "recall"] as const;

/**
 * Per-rule counts and ratios, straight from the committed accuracy.json that
 * scripts/accuracy.ts writes. No numbers are typed into messages or markup.
 */
export function AccuracyTable({
  data,
  labels,
  locale,
}: {
  data: AccuracyData;
  labels: AccuracyLabels;
  locale: string;
}) {
  const cells = (row: AccuracyData["overall"]) => [
    String(row.tp),
    String(row.fp),
    String(row.fn),
    formatRatio(row.precision, locale, labels.na),
    formatRatio(row.recall, locale, labels.na),
  ];

  return (
    <div
      role="region"
      aria-label={labels.caption}
      tabIndex={0}
      className="relative overflow-x-auto rounded-lg border bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <table className="w-full min-w-[20rem] border-collapse text-left text-[0.9375rem]">
        <caption className="sr-only">{labels.caption}</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="px-3 py-3 font-semibold">
              {labels.rule}
            </th>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="px-2 py-3 text-right font-semibold">
                <span aria-hidden="true">{labels.columns[c].short}</span>
                <span className="sr-only">{labels.columns[c].full}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rules.map((row) => (
            <tr key={row.ruleId} className="border-b">
              <th scope="row" className="px-3 py-3 font-medium">
                {labels.ruleNames[row.ruleId] ?? row.ruleId}
              </th>
              {cells(row).map((value, i) => (
                <td key={COLUMNS[i]} className="px-2 py-3 text-right tabular-nums">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" className="px-3 py-3">
              {labels.overall}
            </th>
            {cells(data.overall).map((value, i) => (
              <td key={COLUMNS[i]} className="px-2 py-3 text-right tabular-nums">
                {value}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
