import type { Finding, LineItem } from "@/lib/types";
import type { PtpEdit, RulesLookups } from "./lookups";

/** Modifiers that bypass an indicator-1 edit. Read only from a line's `modifiers` field. */
const BYPASS_MODIFIERS = new Set(["59", "XE", "XP", "XS", "XU"]);

/** Modifier 25 also bypasses an indicator-1 edit, but only on an E/M column 2 line (99202-99499). */
const EM_BYPASS_MODIFIER = "25";

function isEvaluationAndManagement(code: string | null): boolean {
  if (code === null || !/^\d{5}$/.test(code)) return false;
  const n = Number(code);
  return n >= 99202 && n <= 99499;
}

function bypassesEdit(col2: LineItem): boolean {
  if (col2.modifiers.some((m) => BYPASS_MODIFIERS.has(m))) return true;
  return isEvaluationAndManagement(col2.code) && col2.modifiers.includes(EM_BYPASS_MODIFIER);
}

/**
 * Flags pairs of lines on the same date of service that an NCCI procedure-to-
 * procedure edit says should not be billed together. Both orders of each pair
 * are looked up; column 1 is the code that stays payable, column 2 the one that
 * is bundled into it. Indicator 0 always fires (high confidence); indicator 1
 * fires only when the column 2 line carries none of 59/XE/XP/XS/XU, nor 25 on an E/M code (medium).
 * Amount at stake is the column 2 line's charge (never negative).
 */
export async function ncciUnbundling(
  bill: { lineItems: LineItem[] },
  lookups: RulesLookups,
): Promise<Finding[]> {
  const lines = bill.lineItems.filter((l) => l.code !== null && l.dateOfService !== null);
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i];
      const b = lines[j];
      if (a.dateOfService !== b.dateOfService || a.code === b.code) continue;
      for (const [col1, col2] of [
        [a, b],
        [b, a],
      ]) {
        const edit = await activeEdit(lookups, col1, col2);
        if (!edit) continue;
        if (edit.modifierIndicator === 1 && bypassesEdit(col2)) continue;
        findings.push({
          id: `ncci_unbundling:${col1.id}+${col2.id}`,
          ruleId: "ncci_unbundling",
          lineItemIds: [col1.id, col2.id],
          severity: "warning",
          confidence: edit.modifierIndicator === 0 ? "high" : "medium",
          amountAtStakeCents: Math.max(0, col2.chargeCents),
          evidence: `column1=${col1.code};column2=${col2.code};date=${col1.dateOfService};indicator=${edit.modifierIndicator}`,
          citation: `ncci_unbundling.ptp_indicator_${edit.modifierIndicator}`,
        });
      }
    }
  }
  return findings;
}

/** The latest-effective edit active on the lines' shared date, if any. */
async function activeEdit(lookups: RulesLookups, col1: LineItem, col2: LineItem): Promise<PtpEdit | undefined> {
  // Lines were filtered to non-null code and date.
  const edits = await lookups.getPtpEdits(col1.code!, col2.code!, col1.dateOfService!);
  return edits.at(-1);
}
