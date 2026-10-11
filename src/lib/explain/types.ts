import type { Locale } from "@/i18n/locale";

/**
 * Opaque, content-free failure codes for plain-language explanations. These
 * are the only thing ever logged or returned about a failed explanation.
 */
export const EXPLAIN_ERROR_CODES = [
  "disabled",
  "invalid_mode",
  "missing_api_key",
  "invalid_code",
  "unauthenticated",
  "rate_limited",
  "timeout",
  "refused",
  "truncated",
  "invalid_output",
  "provider_error",
] as const;
export type ExplainErrorCode = (typeof EXPLAIN_ERROR_CODES)[number];

export class ExplainError extends Error {
  readonly code: ExplainErrorCode;
  constructor(code: ExplainErrorCode) {
    super(code);
    this.name = "ExplainError";
    this.code = code;
  }
}

export function toExplainErrorCode(error: unknown): ExplainErrorCode {
  return error instanceof ExplainError ? error.code : "provider_error";
}

export type ExplainRequest = {
  /** Already validated with `parseBillingCode`. */
  code: string;
  language: Locale;
  /**
   * Optional printed description: untrusted text from a bill, passed to the
   * model as quoted data. The app does not currently send it (only the code
   * leaves the server, which keeps the privacy copy true); the explainer and
   * cache rules stay safe if that ever changes.
   */
  description?: string;
};

/**
 * Turns a billing code into a short, general, plain-language explanation. It
 * only ever explains; it never decides findings (CLAUDE.md rule 1).
 */
export interface CodeExplainer {
  explainCode(request: ExplainRequest): Promise<string>;
}
