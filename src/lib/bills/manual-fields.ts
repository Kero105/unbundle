import type { ParseResult } from "@/app/bills/[id]/review/fields";
import { MANUAL_CODE_PATTERN } from "./manual-entry";

/**
 * Billing code for hand entry: empty means "no code on the bill" (null);
 * otherwise trimmed, upper-cased and checked against the same pattern the
 * server and database use.
 */
export function parseManualCode(text: string): ParseResult<string | null> {
  const t = text.trim().toUpperCase();
  if (t === "") return { ok: true, value: null };
  return MANUAL_CODE_PATTERN.test(t) ? { ok: true, value: t } : { ok: false };
}
