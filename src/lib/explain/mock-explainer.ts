import type { Locale } from "@/i18n/locale";
import { ExplainError, type CodeExplainer, type ExplainRequest } from "./types";
import { codeKind, parseBillingCode, type CodeKind } from "./validate";

/** Looks up the generic template text for a code kind in a language (from next-intl messages). */
export type MockTemplates = (language: Locale, kind: CodeKind) => string;

/**
 * Offline stand-in used in mock mode, in the demo and in tests. It returns a
 * short generic template per code type and never makes a network call.
 */
export class MockExplainer implements CodeExplainer {
  constructor(private readonly templates: MockTemplates) {}

  async explainCode(request: ExplainRequest): Promise<string> {
    const code = parseBillingCode(request.code);
    const text = this.templates(request.language, codeKind(code));
    if (!text) throw new ExplainError("invalid_output");
    return text;
  }
}
