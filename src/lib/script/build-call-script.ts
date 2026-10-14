import type { LetterItem } from "@/app/bills/[id]/letter/letter-model";

/**
 * Plain-text phone script built from findings that already exist. It only
 * formats: every item comes from a finding, in the letter's order, and no
 * amount is computed here. Pure, no clock, no network, nothing stored.
 */

export interface CallScriptText {
  opening: string;
  closing: string;
  /** Used when there are no findings (the generic script on the help page). */
  generic: string;
  /** One line per bill line, e.g. `CODE: description (date) - $12.00`. */
  line: (v: { code: string; description: string; date: string; charge: string }) => string;
  noCode: string;
  noDate: string;
  /** Question to ask for a finding's reason (a Report.why key). */
  ask: (reason: LetterItem["reason"]) => string;
  lead: Record<LetterItem["tone"], string>;
  item: (v: { number: number; amount: string }) => string;
}

export function buildCallScript(
  items: readonly LetterItem[],
  text: CallScriptText,
  formatCents: (cents: number) => string,
): string {
  const out: string[] = [text.opening, ""];

  if (items.length === 0) {
    out.push(text.generic);
  } else {
    for (const item of items) {
      out.push(text.item({ number: item.number, amount: formatCents(item.amountInQuestionCents) }));
      for (const l of item.lines) {
        out.push(
          "  " +
            text.line({
              code: l.code ?? text.noCode,
              description: l.description,
              date: l.dateOfService ?? text.noDate,
              charge: formatCents(l.chargeCents),
            }),
        );
      }
      out.push(`  ${text.lead[item.tone]} ${text.ask(item.reason)}`, "");
    }
  }

  out.push(text.closing);
  return out.join("\n");
}
