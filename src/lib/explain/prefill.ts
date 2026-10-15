import { z } from "zod";
import { locales } from "@/i18n/locale";
import { parseBillingCode } from "./validate";

const EntrySchema = z.object({ code: z.string(), language: z.enum(locales) }).strict();

export type PrefillEntry = { code: string; language: (typeof locales)[number] };

/**
 * Validates the reviewed code list used by `npm run explain:prefill`. Every
 * code goes through the same strict check as live requests (exactly five
 * letters or digits), so a typo fails the whole run before any model call.
 * Duplicates are dropped.
 */
export function parsePrefillList(input: unknown): PrefillEntry[] {
  const entries = z.array(EntrySchema).parse(input);
  const seen = new Set<string>();
  const out: PrefillEntry[] = [];
  for (const entry of entries) {
    const code = parseBillingCode(entry.code);
    const key = `${code}|${entry.language}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ code, language: entry.language });
  }
  return out;
}

/**
 * The model for `npm run explain:prefill`. There is no default: the model is
 * `--model <id>` or EXPLAIN_MODEL, so a bulk run never picks up a model by
 * accident. The flag wins over the env var. Returns null when neither is set.
 */
export function resolvePrefillModel(argv: string[], env: Record<string, string | undefined>): string | null {
  const i = argv.indexOf("--model");
  if (i !== -1) {
    const value = argv[i + 1]?.trim();
    return value && !value.startsWith("--") ? value : null;
  }
  return env.EXPLAIN_MODEL?.trim() || null;
}
