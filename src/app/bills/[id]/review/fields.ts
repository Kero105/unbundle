import { z } from "zod";
import { dollarsToCents } from "@/lib/money";
import { ModifierSchema } from "@/lib/types";

export type ParseResult<T> = { ok: true; value: T } | { ok: false };

const ok = <T,>(value: T): ParseResult<T> => ({ ok: true, value });
const fail = { ok: false } as const;

/** Empty string means "no value" (null); otherwise a real calendar date `YYYY-MM-DD`. */
export function parseDate(text: string): ParseResult<string | null> {
  const t = text.trim();
  if (t === "") return ok(null);
  return z.iso.date().safeParse(t).success ? ok(t) : fail;
}

/** Empty string means "no value" (null). */
export function parseOptionalText(text: string): ParseResult<string | null> {
  const t = text.trim();
  return ok(t === "" ? null : t);
}

export function parseRequiredText(text: string): ParseResult<string> {
  const t = text.trim();
  return t === "" ? fail : ok(t);
}

/** Whole number >= 1, matching LineItemSchema.units. */
export function parseUnits(text: string): ParseResult<number> {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return fail;
  const n = Number(t);
  return Number.isSafeInteger(n) && n >= 1 ? ok(n) : fail;
}

function toCents(text: string): number | null {
  try {
    const cents = dollarsToCents(text);
    return Number.isSafeInteger(cents) ? cents : null;
  } catch {
    return null;
  }
}

export function parseMoney(text: string): ParseResult<number> {
  const cents = toCents(text);
  return cents === null ? fail : ok(cents);
}

/** Empty string means "no price" (null). */
export function parseOptionalMoney(text: string): ParseResult<number | null> {
  if (text.trim() === "") return ok(null);
  const cents = toCents(text);
  return cents === null ? fail : ok(cents);
}

/** Comma- or space-separated two-character modifiers; uppercased, de-duplicated, order kept. */
export function parseModifiers(text: string): ParseResult<string[]> {
  const parts = text
    .split(/[\s,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.every((m) => ModifierSchema.safeParse(m).success) ? ok(unique) : fail;
}
