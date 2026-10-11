/**
 * Opaque, content-free failure codes. These are the only thing that is ever
 * stored, logged or returned about a failed extraction: never model output,
 * bill text, or validation issue details (which can echo values).
 */
export const EXTRACTION_ERROR_CODES = [
  "disabled",
  "missing_api_key",
  "invalid_mode",
  "unauthenticated",
  "not_found",
  "busy",
  "rate_limited",
  "already_done",
  "claim_failed",
  "no_files",
  "file_unreadable",
  "file_too_large",
  "invalid_output",
  "refused",
  "truncated",
  "timeout",
  "provider_busy",
  "provider_error",
  "save_failed",
] as const;

export type ExtractionErrorCode = (typeof EXTRACTION_ERROR_CODES)[number];

export class ExtractionError extends Error {
  readonly code: ExtractionErrorCode;

  constructor(code: ExtractionErrorCode) {
    // The message is the code, so an uncaught error can't leak anything else.
    super(code);
    this.name = "ExtractionError";
    this.code = code;
  }
}

export function toErrorCode(error: unknown): ExtractionErrorCode {
  return error instanceof ExtractionError ? error.code : "provider_error";
}
