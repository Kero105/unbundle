import type { ExtractedBill, Finding } from "@/lib/types";
import { dateMismatch } from "./date-mismatch";
import { duplicateCharge } from "./duplicate-charge";
import { createInMemoryLookups } from "./in-memory-lookups";
import type { RulesLookups } from "./lookups";
import { mathError } from "./math-error";
import type { Rule } from "./types";

export type { Rule } from "./types";
export type { Mue, PtpEdit, RateLookup, RulesLookups } from "./lookups";
export { dateMismatch, duplicateCharge, mathError };

/** Registered rules, run in this order. */
export const rules: readonly Rule[] = [duplicateCharge, mathError, dateMismatch];

/**
 * Runs the rules in order and concatenates their findings. `lookups` defaults to
 * an empty in-memory set, which is only right for rules that need no reference
 * data; production callers pass `createSupabaseLookups(client)`.
 */
export async function runRules(
  bill: ExtractedBill,
  registered: readonly Rule[] = rules,
  lookups: RulesLookups = createInMemoryLookups(),
): Promise<Finding[]> {
  const results: Finding[][] = [];
  for (const rule of registered) results.push(await rule(bill, lookups));
  return results.flat();
}
