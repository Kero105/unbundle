import type { Finding } from "@/lib/types";
import type { BillRule } from "./types";

/** An uncoded line charging strictly more than this ($100.00) is flagged whatever its description says. */
export const VAGUE_CHARGE_THRESHOLD_CENTS = 10000;

/** Generic words that make an uncoded line's description uninformative. Matched as whole words. */
export const VAGUE_TERMS = ["misc", "miscellaneous", "other", "supplies", "services", "pharmacy", "general"] as const;

const WORD_RE = /[a-z]+/g;

/** First generic term appearing as a whole word in the description, or null. */
function vagueTerm(description: string): string | null {
  const words = new Set(description.toLowerCase().match(WORD_RE) ?? []);
  return VAGUE_TERMS.find((t) => words.has(t)) ?? null;
}

/**
 * Flags lines with no code that either describe themselves with a generic term
 * (misc, miscellaneous, other, supplies, services, pharmacy, general; whole words,
 * case-insensitive) or charge more than $100.00. A line with a code is never
 * flagged, whatever its description says. Lines whose charge is zero or negative
 * are skipped: there is nothing at stake. Amount at stake is the full charge.
 *
 * Evidence carries the matched term from the fixed list, never the description.
 */
export const vagueCharge: BillRule = (bill) => {
  const findings: Finding[] = [];
  for (const l of bill.lineItems) {
    if (l.code !== null && l.code.trim() !== "") continue;
    if (l.chargeCents <= 0) continue;

    const term = vagueTerm(l.descriptionRaw);
    const overThreshold = l.chargeCents > VAGUE_CHARGE_THRESHOLD_CENTS;
    if (term === null && !overThreshold) continue;

    const reasons = [term !== null ? `term=${term}` : null, overThreshold ? `over_cents=${VAGUE_CHARGE_THRESHOLD_CENTS}` : null];
    findings.push({
      id: `vague_charge:${l.id}`,
      ruleId: "vague_charge",
      lineItemIds: [l.id],
      severity: "warning",
      confidence: "medium",
      amountAtStakeCents: l.chargeCents,
      evidence: `${reasons.filter((r) => r !== null).join(";")};charge_cents=${l.chargeCents}`,
      citation: "vague_charge.uncoded_line",
    });
  }
  return findings;
};
