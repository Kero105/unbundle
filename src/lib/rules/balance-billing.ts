import type { EobLine, Finding, LineItem } from "@/lib/types";
import type { BillRule } from "./types";

const keyOf = (date: string | null, code: string | null) =>
  date === null || code === null ? null : `${date}|${code}`;

function group<T>(items: readonly T[], key: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (k === null) continue;
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return map;
}

/**
 * Flags a bill line that charges the patient more than the EOB says the
 * patient owes for the same service. A bill line is matched to an EOB line by
 * date of service and code, and only when the match is unambiguous: exactly
 * one bill line and exactly one EOB line share that date and code. Anything
 * else is left alone rather than guessed at.
 *
 * Denied EOB lines are skipped (that is `denied_billed_in_full`), as are lines
 * where either side's patient amount is unknown. Fires when `patientOwesCents`
 * is greater than the EOB's `patientResponsibilityCents`. Amount at stake is
 * the difference. Confidence is medium: EOBs and bills are processed at
 * different times, so the gap may be a payment or adjustment not yet shown.
 */
export const balanceBilling: BillRule = (bill) => {
  const findings: Finding[] = [];
  const billByKey = group<LineItem>(bill.lineItems, (l) => keyOf(l.dateOfService, l.code));
  const eobByKey = group<EobLine>(bill.eobLines, (e) => keyOf(e.dateOfService, e.code));

  for (const [key, lines] of billByKey) {
    const eobs = eobByKey.get(key);
    if (lines.length !== 1 || eobs === undefined || eobs.length !== 1) continue;
    const [line] = lines;
    const [eob] = eobs;

    if (eob.denialReason !== null && eob.denialReason.trim() !== "") continue;
    if (line.patientOwesCents === null || eob.patientResponsibilityCents === null) continue;
    if (line.patientOwesCents <= eob.patientResponsibilityCents) continue;

    const difference = line.patientOwesCents - eob.patientResponsibilityCents;
    findings.push({
      id: `balance_billing:${line.id}`,
      ruleId: "balance_billing",
      lineItemIds: [line.id],
      severity: "warning",
      confidence: "medium",
      amountAtStakeCents: difference,
      evidence: `eob_line=${eob.id};code=${line.code};date=${line.dateOfService};patient_owes_cents=${line.patientOwesCents};eob_patient_responsibility_cents=${eob.patientResponsibilityCents};difference_cents=${difference}`,
      citation: "balance_billing.patient_charged_above_eob_responsibility",
    });
  }
  return findings;
};
