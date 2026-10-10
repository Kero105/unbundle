import type { ExtractedBill, Finding } from "@/lib/types";
import type { RulesLookups } from "./lookups";

/**
 * A rule is deterministic: no clock, randomness, or LLM. Reference data comes
 * only through `lookups` (exact-key reads of static CMS/HHS tables), so the
 * same bill and the same reference data always give the same findings. Rules
 * that need no reference data can ignore the second argument and stay sync.
 */
export type Rule = (
  bill: ExtractedBill,
  lookups: RulesLookups,
) => Finding[] | Promise<Finding[]>;

/** A rule that needs no reference data: sync, one argument. Assignable to `Rule`. */
export type BillRule = (bill: ExtractedBill) => Finding[];
