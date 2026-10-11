import type { ExtractedBill, Finding, LineItem } from "@/lib/types";

export interface ReportFinding {
  finding: Finding;
  lineItems: LineItem[];
}

export interface Report {
  findings: ReportFinding[];
  totalAtStakeCents: number;
}

/**
 * Total at stake, de-duplicated so one overcharge isn't counted once per rule.
 *
 * Findings that touch the same line item overlap: the money is the same money.
 * For a single line, the largest finding amount counts once. A finding that
 * spans several lines has no per-line breakdown, so we can't split its amount
 * across them. Instead, findings are grouped transitively by shared line items
 * (a finding on [a, b] and another on [b] fall in one group), and each group
 * counts only its largest amount. That is order-independent and errs low, never
 * overstating what the patient could recover. A spanning finding is therefore
 * counted exactly once, not once per line. Findings with no line items can't
 * overlap anything and count in full.
 */
function dedupedTotalAtStakeCents(findings: readonly Finding[]): number {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  for (const f of findings) {
    for (const id of f.lineItemIds) if (!parent.has(id)) parent.set(id, id);
    for (const id of f.lineItemIds.slice(1)) {
      parent.set(find(id), find(f.lineItemIds[0]));
    }
  }

  let total = 0;
  const maxByGroup = new Map<string, number>();
  for (const f of findings) {
    if (f.lineItemIds.length === 0) {
      total += f.amountAtStakeCents;
      continue;
    }
    const root = find(f.lineItemIds[0]);
    maxByGroup.set(root, Math.max(maxByGroup.get(root) ?? 0, f.amountAtStakeCents));
  }
  for (const max of maxByGroup.values()) total += max;
  return total;
}

/**
 * Shapes rule output for display: largest amount first (ties keep rule order),
 * line items resolved from the bill, and the de-duplicated amount at stake.
 * Findings are never added, dropped, or changed here; each keeps its own amount.
 */
export function buildReport(bill: ExtractedBill, findings: readonly Finding[]): Report {
  const byId = new Map(bill.lineItems.map((item) => [item.id, item]));
  const sorted = [...findings].sort((a, b) => b.amountAtStakeCents - a.amountAtStakeCents);
  return {
    findings: sorted.map((finding) => ({
      finding,
      lineItems: finding.lineItemIds.flatMap((id) => byId.get(id) ?? []),
    })),
    totalAtStakeCents: dedupedTotalAtStakeCents(findings),
  };
}

/** Message keys under `Report.why`, one per citation the rules emit. */
const WHY_KEYS = {
  "duplicate_charge.same_code_date_units_price": "duplicateCharge",
  "math_error.charge_exceeds_units_times_price": "mathError",
  "date_mismatch.outside_service_range": "dateMismatch",
  "ncci_unbundling.ptp_indicator_0": "ncciNever",
  "ncci_unbundling.ptp_indicator_1": "ncciModifier",
  "mue_exceeded.adjudication_indicator_1": "mueLine",
  "mue_exceeded.adjudication_indicator_2": "mueDayPolicy",
  "mue_exceeded.adjudication_indicator_3": "mueDayClinical",
  "price_outlier.medicare_5x_la_office": "priceOutlier",
  "vague_charge.uncoded_line": "vagueCharge",
  "denied_billed_in_full.denied_line_charged_to_patient": "deniedBilled",
  "balance_billing.patient_charged_above_eob_responsibility": "balanceBilling",
} as const;

export type WhyKey = (typeof WHY_KEYS)[keyof typeof WHY_KEYS] | "fallback";

export function whyKey(citation: string): WhyKey {
  return Object.hasOwn(WHY_KEYS, citation)
    ? WHY_KEYS[citation as keyof typeof WHY_KEYS]
    : "fallback";
}
