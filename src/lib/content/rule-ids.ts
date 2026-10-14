/** Registered rule ids in run order. The Methodology messages need an entry for each. */
export const RULE_IDS = [
  "duplicate_charge",
  "math_error",
  "date_mismatch",
  "ncci_unbundling",
  "mue_exceeded",
  "price_outlier",
  "vague_charge",
  "denied_billed_in_full",
  "balance_billing",
] as const;
