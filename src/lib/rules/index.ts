import type { ExtractedBill, Finding } from "@/lib/types";
import { dateMismatch } from "./date-mismatch";
import { duplicateCharge } from "./duplicate-charge";
import type { RulesLookups } from "./lookups";
import { mathError } from "./math-error";
import { mueExceeded } from "./mue-exceeded";
import { ncciUnbundling } from "./ncci-unbundling";
import { priceOutlier } from "./price-outlier";
import type { Rule } from "./types";

export type { Rule } from "./types";
export type { Mue, PtpEdit, RateLookup, RulesLookups } from "./lookups";
export { dateMismatch, duplicateCharge, mathError, mueExceeded, ncciUnbundling, priceOutlier };

/** Registered rules, run in this order. */
export const rules: readonly Rule[] = [duplicateCharge, mathError, dateMismatch, ncciUnbundling, mueExceeded, priceOutlier];

/**
 * Runs the rules in order and concatenates their findings. `lookups` is required
 * so a missing adapter is a compile error; production callers pass
 * `createSupabaseLookups(client)`, tests pass `createInMemoryLookups(...)`.
 */
export async function runRules(
  bill: ExtractedBill,
  lookups: RulesLookups,
  registered: readonly Rule[] = rules,
): Promise<Finding[]> {
  const results: Finding[][] = [];
  for (const rule of registered) results.push(await rule(bill, lookups));
  return results.flat();
}
