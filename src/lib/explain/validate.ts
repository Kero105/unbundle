import { z } from "zod";
import { ExplainError } from "./types";

/** CPT (5 digits, or 4 digits + letter), HCPCS (letter + 4 digits), revenue (4 digits) and DRG (3 digits). */
const CODE_PATTERN = /^(?:\d{5}|\d{4}[A-Z]|[A-Z]\d{4}|\d{4}|\d{3})$/;

export type CodeKind = "cpt" | "hcpcs" | "revenue" | "drg";

/** Returns the normalized code, or throws ExplainError("invalid_code"). Free text never gets through. */
export function parseBillingCode(input: unknown): string {
  if (typeof input !== "string") throw new ExplainError("invalid_code");
  const code = input.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) throw new ExplainError("invalid_code");
  return code;
}

export function codeKind(code: string): CodeKind {
  if (/^\d{5}$/.test(code) || /^\d{4}[A-Z]$/.test(code)) return "cpt";
  if (/^[A-Z]\d{4}$/.test(code)) return "hcpcs";
  if (/^\d{4}$/.test(code)) return "revenue";
  return "drg";
}

export const MAX_DESCRIPTION_CHARS = 80;

/** Bill text is untrusted: strip control characters and cap it before it goes anywhere near a prompt. */
export function sanitizeDescription(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const cleaned = input
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/[<>`"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DESCRIPTION_CHARS);
  return cleaned || undefined;
}

export const MAX_EXPLANATION_CHARS = 600;
export const MIN_EXPLANATION_CHARS = 20;

export const ExplanationTextSchema = z
  .string()
  .trim()
  .min(MIN_EXPLANATION_CHARS)
  .max(MAX_EXPLANATION_CHARS)
  // Plain prose only: no links, markup or code fences.
  .refine((text) => !/https?:\/\/|www\.|[<>`{}[\]]/i.test(text));

export const ModelExplanationSchema = z.object({ explanation: ExplanationTextSchema }).strict();

/** Strictly validates the model's JSON; anything else fails closed. */
export function parseModelExplanation(raw: unknown): string {
  const parsed = ModelExplanationSchema.safeParse(raw);
  if (!parsed.success) throw new ExplainError("invalid_output");
  return parsed.data.explanation;
}
