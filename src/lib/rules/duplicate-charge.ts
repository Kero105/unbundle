import type { Finding, LineItem } from "@/lib/types";
import type { Rule } from "./types";

function key(l: LineItem): string {
  return JSON.stringify([
    l.code,
    l.dateOfService,
    [...l.modifiers].sort(),
    l.units,
    l.unitPriceCents,
    l.chargeCents,
  ]);
}

/**
 * Flags lines that repeat the same code, date, modifiers, units, price and charge.
 * Lines without a code or date, or with a non-positive charge, are never compared.
 * Amount at stake is one copy's charge for each extra copy.
 */
export const duplicateCharge: Rule = (bill) => {
  const groups = new Map<string, LineItem[]>();
  for (const l of bill.lineItems) {
    if (l.code === null || l.dateOfService === null || l.chargeCents <= 0) continue;
    const k = key(l);
    const group = groups.get(k);
    if (group) group.push(l);
    else groups.set(k, [l]);
  }

  const findings: Finding[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const lineItemIds = group.map((l) => l.id);
    findings.push({
      id: `duplicate_charge:${lineItemIds.join("+")}`,
      ruleId: "duplicate_charge",
      lineItemIds,
      severity: "warning",
      confidence: "medium",
      amountAtStakeCents: group[0].chargeCents * (group.length - 1),
      evidence: `code=${group[0].code};date=${group[0].dateOfService};copies=${group.length}`,
      citation: "duplicate_charge.same_code_date_units_price",
    });
  }
  return findings;
};
