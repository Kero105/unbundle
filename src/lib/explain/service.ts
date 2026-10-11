import type { Locale } from "@/i18n/locale";
import { ExplainError, type CodeExplainer } from "./types";
import { parseBillingCode, sanitizeDescription, ExplanationTextSchema } from "./validate";

/** Everything the cache-first flow touches, injected so it is testable without a database or network. */
export interface ExplainDeps {
  mode: "mock" | "anthropic";
  explainer: CodeExplainer;
  /** Reads the shared per-code cache (user-scoped client). Returns validated text or null. */
  readCache(code: string, language: Locale): Promise<string | null>;
  /** Spends one slot of the shared per-user AI budget. Throws ExplainError("rate_limited") when exhausted. */
  claimBudget(): Promise<void>;
  /** Stores a model-written explanation for everyone. Best effort; never throws into the request. */
  writeCache(code: string, language: Locale, text: string): Promise<void>;
}

export type ExplainResult = { text: string; source: "cache" | "mock" | "model" };

/**
 * Cache first, then the explainer. Only anthropic mode spends budget or
 * touches the shared cache; mock text is never cached. A model answer is
 * written back only when no bill description was part of the prompt, so one
 * user's bill text can never shape what other users are shown.
 */
export async function explainWithCache(
  deps: ExplainDeps,
  input: { code: unknown; language: Locale; description?: string },
): Promise<ExplainResult> {
  const code = parseBillingCode(input.code);

  if (deps.mode === "mock") {
    const text = await deps.explainer.explainCode({ code, language: input.language });
    return { text, source: "mock" };
  }

  const cached = await deps.readCache(code, input.language).catch(() => null);
  if (cached !== null) {
    const valid = ExplanationTextSchema.safeParse(cached);
    if (valid.success) return { text: valid.data, source: "cache" };
  }

  await deps.claimBudget();

  const description = sanitizeDescription(input.description);
  const text = await deps.explainer.explainCode({ code, language: input.language, description });
  const checked = ExplanationTextSchema.safeParse(text);
  if (!checked.success) throw new ExplainError("invalid_output");

  if (description === undefined) {
    await deps.writeCache(code, input.language, checked.data).catch(() => undefined);
  }
  return { text: checked.data, source: "model" };
}
