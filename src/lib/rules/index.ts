import type { ExtractedBill, Finding } from "@/lib/types";
import { dateMismatch } from "./date-mismatch";
import { duplicateCharge } from "./duplicate-charge";
import { mathError } from "./math-error";
import type { Rule } from "./types";

export type { Rule } from "./types";
export { dateMismatch, duplicateCharge, mathError };

/** Registered rules, run in this order. */
export const rules: readonly Rule[] = [duplicateCharge, mathError, dateMismatch];

export function runRules(bill: ExtractedBill, registered: readonly Rule[] = rules): Finding[] {
  return registered.flatMap((rule) => rule(bill));
}
