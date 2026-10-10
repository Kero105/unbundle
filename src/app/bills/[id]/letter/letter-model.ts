import type { Confidence, ExtractedBill, Finding } from "@/lib/types";
import { whyKey, type WhyKey } from "../report/report-model";

/** One bill line a flagged item refers to. Amounts are integer cents. */
export interface LetterLine {
  code: string | null;
  description: string;
  /** ISO date (YYYY-MM-DD) or null when the bill has none. */
  dateOfService: string | null;
  chargeCents: number;
}

/**
 * One numbered entry in the letter. Wording is `soft` unless the rule engine
 * was highly confident, so a shaky finding never reads as an accusation.
 */
export interface LetterItem {
  number: number;
  findingId: string;
  reason: WhyKey;
  tone: "firm" | "soft";
  lines: LetterLine[];
  /** The finding's own amount at stake, passed through unchanged. */
  amountInQuestionCents: number;
}

export interface LetterModel {
  items: LetterItem[];
}

function toneFor(confidence: Confidence): LetterItem["tone"] {
  return confidence === "high" ? "firm" : "soft";
}

/**
 * Shapes rule output into letter items. Findings are never added, dropped, or
 * changed: every finding becomes exactly one item, ordered by amount in
 * question (largest first, ties keep rule order) and numbered from 1. Line
 * items are resolved from the bill; ids that are not on the bill are skipped.
 */
export function buildLetterModel(bill: ExtractedBill, findings: readonly Finding[]): LetterModel {
  const byId = new Map(bill.lineItems.map((item) => [item.id, item]));
  const sorted = [...findings].sort((a, b) => b.amountAtStakeCents - a.amountAtStakeCents);

  return {
    items: sorted.map((finding, index) => ({
      number: index + 1,
      findingId: finding.id,
      reason: whyKey(finding.citation),
      tone: toneFor(finding.confidence),
      lines: finding.lineItemIds.flatMap((id) => {
        const li = byId.get(id);
        return li
          ? [
              {
                code: li.code,
                description: li.descriptionRaw,
                dateOfService: li.dateOfService,
                chargeCents: li.chargeCents,
              },
            ]
          : [];
      }),
      amountInQuestionCents: finding.amountAtStakeCents,
    })),
  };
}
