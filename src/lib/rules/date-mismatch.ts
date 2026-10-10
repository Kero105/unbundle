import type { Finding } from "@/lib/types";
import type { BillRule } from "./types";

/**
 * Flags lines whose date of service falls outside the statement's service range
 * (inclusive on both ends). Either bound may be missing; with neither, nothing is
 * checked. An inverted range (start after end) is treated as malformed and skipped.
 * Amount at stake is the line's full charge (never negative).
 */
export const dateMismatch: BillRule = (bill) => {
  const { serviceStart: start, serviceEnd: end } = bill;
  if (start !== null && end !== null && start > end) return [];

  const findings: Finding[] = [];
  for (const l of bill.lineItems) {
    const d = l.dateOfService;
    if (d === null) continue;
    // ISO dates (YYYY-MM-DD) order correctly as strings.
    if ((start !== null && d < start) || (end !== null && d > end)) {
      findings.push({
        id: `date_mismatch:${l.id}`,
        ruleId: "date_mismatch",
        lineItemIds: [l.id],
        severity: "warning",
        confidence: "high",
        amountAtStakeCents: Math.max(0, l.chargeCents),
        evidence: `date=${d};start=${start ?? ""};end=${end ?? ""}`,
        citation: "date_mismatch.outside_service_range",
      });
    }
  }
  return findings;
};
