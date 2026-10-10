/**
 * Good Faith Estimate comparison (No Surprises Act, uninsured / self-pay).
 *
 * VERIFY BEFORE LAUNCH: this reflects the federal patient-provider dispute
 * resolution process for uninsured or self-pay patients (billed charges at
 * least $400 above the Good Faith Estimate; dispute within 120 calendar days
 * of the bill) as we understand it, and must be verified against CMS guidance.
 *
 * Pure and deterministic: integer cents, no network, no clock, no logging. The
 * caller supplies `today`; the function never reads the current date.
 */

/** Billed minus estimate at or above this many cents can be disputed ($400). */
export const GFE_DIFFERENCE_THRESHOLD_CENTS = 40000;
/** Calendar days after the bill date within which a dispute can be started. */
export const GFE_DISPUTE_WINDOW_DAYS = 120;

export interface GoodFaithEstimateInput {
  estimateTotalCents: number;
  billedTotalCents: number;
  /** ISO date, YYYY-MM-DD. Validated; must not be after `billDate`. */
  estimateDate: string;
  /** ISO date, YYYY-MM-DD. */
  billDate: string;
  /** ISO date, YYYY-MM-DD: the day the caller is checking on. */
  today: string;
}

export type GoodFaithEstimateError = "invalid_amount" | "invalid_dates";

export type GoodFaithEstimateExplanationKey =
  | "gfe.over_threshold_in_window"
  | "gfe.over_threshold_window_closed"
  | "gfe.under_threshold";

export type GoodFaithEstimateResult =
  | {
      ok: true;
      /** Billed minus estimate; negative when billed below the estimate. */
      differenceCents: number;
      overThreshold: boolean;
      withinDisputeWindow: boolean;
      /** Message key under the `Assistance` namespace. */
      explanationKey: GoodFaithEstimateExplanationKey;
    }
  | { ok: false; error: GoodFaithEstimateError };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since the Unix epoch for a real calendar date, or null if invalid. */
function toDayNumber(value: string): number | null {
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return Math.round(ms / 86_400_000);
}

export function checkGoodFaithEstimate(input: GoodFaithEstimateInput): GoodFaithEstimateResult {
  const { estimateTotalCents, billedTotalCents } = input;
  if (
    !Number.isSafeInteger(estimateTotalCents) ||
    !Number.isSafeInteger(billedTotalCents) ||
    estimateTotalCents < 0 ||
    billedTotalCents < 0
  ) {
    return { ok: false, error: "invalid_amount" };
  }

  const estimateDay = toDayNumber(input.estimateDate);
  const billDay = toDayNumber(input.billDate);
  const todayDay = toDayNumber(input.today);
  if (
    estimateDay === null ||
    billDay === null ||
    todayDay === null ||
    estimateDay > billDay ||
    todayDay < billDay
  ) {
    return { ok: false, error: "invalid_dates" };
  }

  const differenceCents = billedTotalCents - estimateTotalCents;
  const overThreshold = differenceCents >= GFE_DIFFERENCE_THRESHOLD_CENTS;
  const withinDisputeWindow = todayDay - billDay <= GFE_DISPUTE_WINDOW_DAYS;

  const explanationKey: GoodFaithEstimateExplanationKey = !overThreshold
    ? "gfe.under_threshold"
    : withinDisputeWindow
      ? "gfe.over_threshold_in_window"
      : "gfe.over_threshold_window_closed";

  return { ok: true, differenceCents, overThreshold, withinDisputeWindow, explanationKey };
}
