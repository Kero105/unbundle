export const EXTRACTION_STALE_MS = 5 * 60 * 1000;

export type ExtractionStatus = "pending" | "extracting" | "needs_review" | "failed";

const STATUSES: readonly ExtractionStatus[] = ["pending", "extracting", "needs_review", "failed"];

/**
 * The status to show for a bill. An 'extracting' bill that started more than
 * five minutes ago (or has no start time) is shown as failed so it can be
 * retried; this matches claim_extraction(), which reclaims such bills.
 */
export function displayStatus(
  status: unknown,
  startedAt: string | null | undefined,
  now: number,
): ExtractionStatus {
  const s = STATUSES.find((v) => v === status) ?? "pending";
  if (s !== "extracting") return s;
  const started = startedAt ? Date.parse(startedAt) : NaN;
  if (Number.isNaN(started) || now - started > EXTRACTION_STALE_MS) return "failed";
  return "extracting";
}
