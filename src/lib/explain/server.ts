import "server-only";
import { getLocale } from "next-intl/server";
import { resolveLocale, type Locale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { AnthropicExplainer } from "./anthropic-explainer";
import { writeExplanationToCache } from "./cache-writer";
import { readExplainConfig } from "./config";
import { MockExplainer } from "./mock-explainer";
import { explainWithCache, type ExplainResult } from "./service";
import { ExplainError } from "./types";

const TEMPLATES = { en: en.Explain.generic, es: es.Explain.generic } as const;
const mock = new MockExplainer((language, kind) => TEMPLATES[language][kind]);

/**
 * Entry point for the "What is this?" action.
 *
 * `demo` explanations are always the offline mock: no session, database or
 * model is involved. Real bills require a signed-in user; in anthropic mode
 * the shared per-user budget is claimed in the database (claim_explanation)
 * before any paid call, and the cache is read with the user-scoped client.
 */
export async function explainForRequest(input: {
  code: unknown;
  demo: boolean;
}): Promise<ExplainResult> {
  const language: Locale = resolveLocale(await getLocale(), null);

  if (input.demo) {
    return explainWithCache(
      { mode: "mock", explainer: mock, readCache: async () => null, claimBudget: async () => {}, writeCache: async () => {} },
      { code: input.code, language },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ExplainError("unauthenticated");

  const config = readExplainConfig();
  if (config.mode === "mock") {
    return explainWithCache(
      { mode: "mock", explainer: mock, readCache: async () => null, claimBudget: async () => {}, writeCache: async () => {} },
      { code: input.code, language },
    );
  }

  return explainWithCache(
    {
      mode: "anthropic",
      explainer: AnthropicExplainer.fromApiKey(config.apiKey, config.model),
      async readCache(code, lang) {
        const { data, error } = await supabase
          .from("code_explanations")
          .select("text")
          .eq("code", code)
          .eq("language", lang)
          .maybeSingle();
        return error || !data ? null : data.text;
      },
      async claimBudget() {
        const { data, error } = await supabase.rpc("claim_explanation");
        if (error) throw new ExplainError("provider_error");
        if (data === "claimed") return;
        throw new ExplainError(data === "rate_limited" ? "rate_limited" : "unauthenticated");
      },
      writeCache: (code, lang, text) => writeExplanationToCache(code, lang, text),
    },
    { code: input.code, language },
  );
}
