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

  const stacked = [
    ...data.rules.map((row) => ({
      id: row.ruleId,
      name: labels.ruleNames[row.ruleId] ?? row.ruleId,
      values: cells(row),
    })),
    { id: "overall", name: labels.overall, values: cells(data.overall) },
  ];

  return (
    <>
      {/* Phone width: one card per rule, so nothing scrolls sideways. */}
      <ul aria-label={labels.caption} className="flex flex-col gap-3 sm:hidden">
        {stacked.map(({ id, name, values }) => (
          <li
            key={id}
            className={`rounded-lg border bg-card p-3 ${id === "overall" ? "font-semibold" : ""}`}
          >
            <p className="font-medium">{name}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.9375rem]">
              {COLUMNS.map((c, i) => (
                <div key={c} className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">{labels.columns[c].full}</dt>
                  <dd className="tabular-nums">{values[i]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div
        role="region"
        aria-label={labels.caption}
        tabIndex={0}
        className="relative hidden overflow-x-auto rounded-lg border bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:block"
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
    </>
  );
}
