/**
 * Maps a Good Faith Estimate date pair to a UI-facing problem. This only picks
 * which message to show; `checkGoodFaithEstimate` still decides the result and
 * keeps its own error codes.
 */

export type GfeDateProblem = "missing" | "estimate_after_bill" | "bill_in_future";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * `today` is supplied by the caller (YYYY-MM-DD). Returns null when the pair is
 * fine. An empty or unparseable date counts as "missing".
 */
export function gfeDateProblem(
  estimateDate: string,
  billDate: string,
  today: string,
): GfeDateProblem | null {
  if (!isRealDate(estimateDate) || !isRealDate(billDate)) return "missing";
  // ISO dates compare correctly as strings.
  if (estimateDate > billDate) return "estimate_after_bill";
  if (isRealDate(today) && billDate > today) return "bill_in_future";
  return null;
}
