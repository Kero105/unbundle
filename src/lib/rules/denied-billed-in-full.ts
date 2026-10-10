import type { Finding } from "@/lib/types";
import type { BillRule } from "./types";

/**
 * Flags a bill line that still charges the patient after the EOB denied it. An
 * EOB line with a non-blank denial reason is matched to bill lines with the same
 * date of service and the same code; EOB lines missing either are not matched.
 * The bill line fires when `patientOwesCents` is above zero. A null or zero
 * patient amount does not fire.
 *
 * One finding per bill line, even if several denied EOB lines match it. Amount at
 * stake is the line's `patientOwesCents`. Evidence names the EOB line by its
 * opaque id and never includes the denial reason text.
 */
export const deniedBilledInFull: BillRule = (bill) => {
  const findings: Finding[] = [];
  const flagged = new Set<string>();

  for (const eob of bill.eobLines) {
    if (eob.denialReason === null || eob.denialReason.trim() === "") continue;
    if (eob.code === null || eob.dateOfService === null) continue;

    for (const l of bill.lineItems) {
      if (flagged.has(l.id)) continue;
      if (l.code !== eob.code || l.dateOfService !== eob.dateOfService) continue;
      if (l.patientOwesCents === null || l.patientOwesCents <= 0) continue;

      flagged.add(l.id);
      findings.push({
        id: `denied_billed_in_full:${l.id}`,
        ruleId: "denied_billed_in_full",
        lineItemIds: [l.id],
        severity: "error",
        confidence: "high",
        amountAtStakeCents: l.patientOwesCents,
        evidence: `eob_line=${eob.id};code=${eob.code};date=${eob.dateOfService};patient_owes_cents=${l.patientOwesCents}`,
        citation: "denied_billed_in_full.denied_line_charged_to_patient",
      });
    }
  }
  return findings;
};
