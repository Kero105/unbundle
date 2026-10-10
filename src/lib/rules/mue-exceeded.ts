import type { Finding, LineItem } from "@/lib/types";
import type { Mue, RulesLookups } from "./lookups";

/**
 * Flags a code whose units, summed over every line billed on one date of service,
 * exceed its practitioner MUE (medically unlikely edit). A total equal to the MUE
 * does not fire. Lines without a code or date are skipped, and a code with no MUE
 * entry never fires. An MUE of 0 fires for any billed units.
 *
 * Amount at stake is the excess units times the unit price. When several lines
 * share a code and date, the excess is taken from the last-listed lines first,
 * each at its own unit price (a line with no unit price falls back to its charge
 * divided by units). Confidence is high for adjudication indicators 2 and 3
 * (date-of-service edits) and medium for 1 (a claim-line edit, so a sum across
 * lines is less certain). Never negative.
 */
export async function mueExceeded(
  bill: { lineItems: LineItem[] },
  lookups: RulesLookups,
): Promise<Finding[]> {
  const groups = new Map<string, LineItem[]>();
  for (const l of bill.lineItems) {
    if (l.code === null || l.dateOfService === null) continue;
    const k = JSON.stringify([l.code, l.dateOfService]);
    const group = groups.get(k);
    if (group) group.push(l);
    else groups.set(k, [l]);
  }

  const mues = new Map<string, Mue | null>();
  const findings: Finding[] = [];
  for (const group of groups.values()) {
    const code = group[0].code!;
    const date = group[0].dateOfService!;
    const total = group.reduce((sum, l) => sum + l.units, 0);

    if (!mues.has(code)) mues.set(code, await lookups.getMue(code));
    const mue = mues.get(code);
    if (!mue || total <= mue.mueValue) continue;

    const excess = total - mue.mueValue;
    let remaining = excess;
    let amount = 0;
    for (const l of [...group].reverse()) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, l.units);
      amount += take * unitPriceCents(l);
      remaining -= take;
    }

    const lineItemIds = group.map((l) => l.id);
    findings.push({
      id: `mue_exceeded:${lineItemIds.join("+")}`,
      ruleId: "mue_exceeded",
      lineItemIds,
      severity: "warning",
      confidence: mue.adjudicationIndicator === 1 ? "medium" : "high",
      amountAtStakeCents: Math.max(0, amount),
      evidence: `code=${code};date=${date};units=${total};mue=${mue.mueValue};indicator=${mue.adjudicationIndicator}`,
      citation: `mue_exceeded.adjudication_indicator_${mue.adjudicationIndicator}`,
    });
  }
  return findings;
}

function unitPriceCents(l: LineItem): number {
  return l.unitPriceCents ?? Math.round(l.chargeCents / l.units);
}
