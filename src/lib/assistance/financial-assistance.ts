/**
 * California hospital financial assistance estimate (AB 1020, Health & Safety
 * Code hospital fair pricing).
 *
 * VERIFY BEFORE LAUNCH: these thresholds reflect AB 1020 as we understand it
 * and must be checked against HCAI's current guidance
 * (https://hcai.ca.gov/affordability/hospital-fair-billing-program/laws-and-regulations/).
 * Each hospital's own policy governs the real outcome; this is an estimate.
 *
 * Pure and deterministic: integer cents, no network, no clock, no logging.
 */

/** 200% of the federal poverty level: at or below, likely free care. */
export const FREE_CARE_MAX_PERCENT_FPL = 200;
/** 400% of the federal poverty level: at or below (and above 200%), likely a discount. */
export const DISCOUNT_MAX_PERCENT_FPL = 400;

const HUNDRED = BigInt(100);

export type PovertyRegion = "contiguous" | "AK" | "HI";

/** One row of `poverty_guidelines`, camelCased. Sizes 1-8 are stored. */
export interface PovertyRow {
  guidelineYear: number;
  region: PovertyRegion;
  householdSize: number;
  povertyLineCents: number;
  perAdditionalPersonCents: number;
}

export interface FinancialAssistanceInput {
  householdSize: number;
  annualIncomeCents: number;
  guidelineYear: number;
  region: PovertyRegion;
}

export type AssistanceTier = "likely_free_care" | "likely_discount" | "likely_not_eligible";

export type FinancialAssistanceError =
  | "invalid_household_size"
  | "invalid_income"
  | "missing_poverty_row";

export type FinancialAssistanceResult =
  | {
      ok: true;
      /** Income as a whole percent of the poverty line, rounded down. */
      percentOfFpl: number;
      tier: AssistanceTier;
      /** Message key under the `Assistance` namespace. */
      explanationKey: `fpl.${AssistanceTier}`;
    }
  | { ok: false; error: FinancialAssistanceError };

export function checkFinancialAssistance(
  input: FinancialAssistanceInput,
  povertyRows: readonly PovertyRow[],
): FinancialAssistanceResult {
  const { householdSize, annualIncomeCents, guidelineYear, region } = input;

  if (!Number.isSafeInteger(householdSize) || householdSize < 1) {
    return { ok: false, error: "invalid_household_size" };
  }
  if (!Number.isSafeInteger(annualIncomeCents) || annualIncomeCents < 0) {
    return { ok: false, error: "invalid_income" };
  }

  const rowFor = (size: number) =>
    povertyRows.find(
      (r) => r.guidelineYear === guidelineYear && r.region === region && r.householdSize === size,
    );
  const baseRow = rowFor(Math.min(householdSize, 8));
  if (!baseRow || baseRow.povertyLineCents <= 0) {
    return { ok: false, error: "missing_poverty_row" };
  }

  // Sizes above 8 use the size-8 line plus the per-person increment.
  const extra = householdSize > 8 ? householdSize - 8 : 0;
  const lineCents = BigInt(baseRow.povertyLineCents) + BigInt(extra) * BigInt(baseRow.perAdditionalPersonCents);
  const incomeCents = BigInt(annualIncomeCents);

  // BigInt keeps `income * 100` exact for any safe-integer income.
  const percentOfFpl = Number((incomeCents * HUNDRED) / lineCents);

  // Compare exactly, not on the rounded percent: 200.5% rounds down to 200 but
  // is above the boundary. Boundaries are inclusive on the lower tier.
  let tier: AssistanceTier;
  if (incomeCents * HUNDRED <= BigInt(FREE_CARE_MAX_PERCENT_FPL) * lineCents) {
    tier = "likely_free_care";
  } else if (incomeCents * HUNDRED <= BigInt(DISCOUNT_MAX_PERCENT_FPL) * lineCents) {
    tier = "likely_discount";
  } else {
    tier = "likely_not_eligible";
  }

  return { ok: true, percentOfFpl, tier, explanationKey: `fpl.${tier}` };
}
