import { z } from "zod";
import { ExplainError } from "./types";

/**
 * Exactly five letters or digits: CPT (5 digits, or 4 digits + letter) and
 * HCPCS Level II (letter + 4 digits). Anything else is rejected before any
 * model call or cache lookup.
 */
const CODE_PATTERN = /^[A-Z0-9]{5}$/;

export type CodeKind = "cpt" | "hcpcs" | "other";

/** True when `input` is a code the explainer accepts, after trimming and upper-casing. */
export function isExplainableCode(input: unknown): boolean {
  return typeof input === "string" && CODE_PATTERN.test(input.trim().toUpperCase());
}

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
  return "other";
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
