import { z } from "zod";
import {
  ExtractedBillSchema,
  LineItemSchema,
  type CodeType,
  type ExtractedBill,
} from "@/lib/types";
import { lineItemFields } from "./line-item-fields";

/**
 * Manual entry: a person types the line items instead of the model reading
 * them. Everything here is pure. The same bounds are enforced again, in SQL,
 * by submit_manual_bill() (migration 0006), because that function is callable
 * by any signed-in client; manual-entry.test.ts checks the two agree.
 */

export const MAX_MANUAL_LINES = 100;
export const MAX_PROVIDER_LENGTH = 200;
/** Service dates must fall on or after this day and no later than tomorrow. */
export const MANUAL_MIN_DATE = "2000-01-01";

/** Billing codes: CPT, HCPCS, revenue and DRG codes, normalized to upper case. */
export const MANUAL_CODE_PATTERN = /^[A-Z0-9]{3,10}$/;

/** Same shapes as codeKind() in the explain validator. */
export const CPT_PATTERNS = [/^\d{5}$/, /^\d{4}[A-Z]$/] as const;
export const HCPCS_PATTERN = /^[A-Z]\d{4}$/;

/** The keys a manual line may carry; the SQL function rejects any others. */
export const MANUAL_LINE_KEYS = [
  "dateOfService",
  "code",
  "descriptionRaw",
  "modifiers",
  "units",
  "unitPriceCents",
  "chargeCents",
] as const;
export const MANUAL_HEADER_KEYS = ["providerName", "serviceStart", "serviceEnd"] as const;

/**
 * price_outlier skips lines whose code type is not CPT or HCPCS, so a wrong
 * type here would silently switch that rule off for the line.
 */
export function deriveCodeType(code: string | null): CodeType | null {
  if (code === null) return null;
  if (CPT_PATTERNS.some((p) => p.test(code))) return "CPT";
  if (HCPCS_PATTERN.test(code)) return "HCPCS";
  return "OTHER";
}

const noControlChars = (value: string) => !/[\u0000-\u001f\u007f]/.test(value);

function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * `today` is passed in (`YYYY-MM-DD`) so this stays free of the clock.
 */
export function manualBillInputSchema(today: string) {
  const latest = nextDay(today);
  const inWindow = (value: string | null) =>
    value === null || (value >= MANUAL_MIN_DATE && value <= latest);

  const line = z
    .object({
      dateOfService: lineItemFields.dateOfService.refine(inWindow),
      code: z.string().trim().toUpperCase().regex(MANUAL_CODE_PATTERN).nullable(),
      descriptionRaw: lineItemFields.descriptionRaw.refine(noControlChars),
      modifiers: lineItemFields.modifiers.refine((m) => new Set(m).size === m.length),
      units: lineItemFields.units,
      unitPriceCents: lineItemFields.unitPriceCents,
      chargeCents: lineItemFields.chargeCents,
    })
    .strict();

  const header = z
    .object({
      providerName: z.string().trim().min(1).max(MAX_PROVIDER_LENGTH).refine(noControlChars),
      serviceStart: z.iso.date().nullable().refine(inWindow),
      serviceEnd: z.iso.date().nullable().refine(inWindow),
    })
    .strict()
    .refine((h) => (h.serviceStart === null) === (h.serviceEnd === null))
    .refine((h) => h.serviceStart === null || h.serviceEnd === null || h.serviceStart <= h.serviceEnd);

  return z
    .object({
      billId: z.uuid().optional(),
      header,
      lines: z.array(line).min(1).max(MAX_MANUAL_LINES),
    })
    .strict();
}

export type ManualBillInput = z.infer<ReturnType<typeof manualBillInputSchema>>;
export type ManualLineInput = ManualBillInput["lines"][number];

export function parseManualBill(
  input: unknown,
  today: string,
): { ok: true; value: ManualBillInput } | { ok: false } {
  const parsed = manualBillInputSchema(today).safeParse(input);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false };
}

/**
 * The bill exactly as the rules will see it after review: the same validated
 * ExtractedBill the extraction path produces. Typed rows are the person's own
 * words, so they are high confidence and already verified; payment columns
 * are not collected. Ids are positional here; the database assigns real ones.
 */
export function toExtractedBill(
  input: Pick<ManualBillInput, "header" | "lines">,
  idFor: (index: number) => string = (index) => `li-${index + 1}`,
): ExtractedBill {
  const lineItems = input.lines.map((l, index) =>
    LineItemSchema.parse({
      id: idFor(index),
      dateOfService: l.dateOfService,
      code: l.code,
      codeType: deriveCodeType(l.code),
      descriptionRaw: l.descriptionRaw,
      modifiers: l.modifiers,
      units: l.units,
      unitPriceCents: l.unitPriceCents,
      chargeCents: l.chargeCents,
      insurancePaidCents: null,
      patientOwesCents: null,
      sourcePage: 1,
      sourceBox: null,
      confidence: "high",
      userVerified: true,
    }),
  );
  return ExtractedBillSchema.parse({
    providerName: input.header.providerName,
    serviceStart: input.header.serviceStart,
    serviceEnd: input.header.serviceEnd,
    totalBilledCents: lineItems.reduce((sum, l) => sum + l.chargeCents, 0),
    insuranceStatus: null,
    lineItems,
    eobLines: [],
  });
}

/** Codes submit_manual_bill() returns besides 'submitted'. Opaque; never content. */
export const MANUAL_RPC_ERRORS = [
  "unauthenticated",
  "not_found",
  "busy",
  "already_done",
  "no_lines",
  "too_many_lines",
  "bad_payload",
  "bad_header",
  "bad_date",
  "bad_cents",
  "bad_units",
  "bad_code",
  "bad_modifier",
  "bad_description",
] as const;

export type ManualRpcError = (typeof MANUAL_RPC_ERRORS)[number];
export type ManualSubmitError = ManualRpcError | "invalid" | "too_many_bills" | "save_failed";

/** Maps the RPC's text result to null (success) or an error code. */
export function interpretManualSubmit(result: unknown): ManualRpcError | "save_failed" | null {
  if (result === "submitted") return null;
  const known = MANUAL_RPC_ERRORS.find((code) => code === result);
  return known ?? "save_failed";
}
