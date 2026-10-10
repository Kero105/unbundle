import type { Finding, LineItem } from "@/lib/types";
import type { RulesLookups } from "./lookups";
import { medicarePriceCents } from "./medicare-price";

/** A unit charge strictly above this multiple of the Medicare price is an outlier. */
export const PRICE_OUTLIER_MULTIPLE = 5;

/** Modifiers that change which mpfs_rates row prices a line. Any other modifier prices as "". */
const PRICING_MODIFIERS = new Set(["26", "TC"]);

/**
 * Flags a CPT/HCPCS line whose unit charge is more than 5x the Medicare Physician
 * Fee Schedule price (Los Angeles locality 18, office setting, standard conversion
 * factor). Exactly 5x does not fire. Lines with no code, a non-CPT/HCPCS code type,
 * no rate row, no payable price (null), or a Medicare price of 0 are skipped.
 *
 * The rate row is looked up by (code, "26" | "TC" | ""), with no fallback to the
 * unmodified row. The unit charge is `unitPriceCents`, or the line charge divided
 * by units when no unit price was extracted; comparisons are done on whole-line
 * totals so everything stays in integer cents.
 *
 * Amount at stake is (unit charge - Medicare price) * units. Severity is warning,
 * confidence medium: Medicare is a benchmark, not what the provider contracted.
 */
export async function priceOutlier(
  bill: { lineItems: LineItem[] },
  lookups: RulesLookups,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const l of bill.lineItems) {
    if (l.code === null || (l.codeType !== "CPT" && l.codeType !== "HCPCS")) continue;

    const modifier = l.modifiers.find((m) => PRICING_MODIFIERS.has(m)) ?? "";
    const rate = await lookups.getRate(l.code, modifier);
    if (!rate) continue;

    const price = medicarePriceCents({ rvu: rate.rvu, gpci: rate.gpci, placeOfService: "office" });
    if (price === null || price <= 0) continue;

    const billedCents = l.unitPriceCents !== null ? l.unitPriceCents * l.units : l.chargeCents;
    const medicareCents = price * l.units;
    if (billedCents <= PRICE_OUTLIER_MULTIPLE * medicareCents) continue;

    findings.push({
      id: `price_outlier:${l.id}`,
      ruleId: "price_outlier",
      lineItemIds: [l.id],
      severity: "warning",
      confidence: "medium",
      amountAtStakeCents: Math.max(0, billedCents - medicareCents),
      evidence: `code=${l.code};modifier=${modifier};units=${l.units};medicare_cents=${price};billed_cents=${billedCents}`,
      citation: "price_outlier.medicare_5x_la_office",
    });
  }
  return findings;
}
