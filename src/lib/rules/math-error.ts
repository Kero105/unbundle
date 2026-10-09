import type { Finding } from "@/lib/types";
import type { Rule } from "./types";

/**
 * Flags lines where the charge exceeds units x unit price.
 * Skipped when the unit price is missing or negative. Undercharges are not flagged.
 * Amount at stake is the overage in cents.
 */
export const mathError: Rule = (bill) => {
  const findings: Finding[] = [];
  for (const l of bill.lineItems) {
    if (l.unitPriceCents === null || l.unitPriceCents < 0) continue;
    const expected = l.units * l.unitPriceCents;
    const overage = l.chargeCents - expected;
    if (overage <= 0) continue;
    findings.push({
      id: `math_error:${l.id}`,
      ruleId: "math_error",
      lineItemIds: [l.id],
      severity: "error",
      confidence: "high",
      amountAtStakeCents: overage,
      evidence: `units=${l.units};unitPriceCents=${l.unitPriceCents};expectedCents=${expected};chargeCents=${l.chargeCents}`,
      citation: "math_error.charge_exceeds_units_times_price",
    });
  }
  return findings;
};
