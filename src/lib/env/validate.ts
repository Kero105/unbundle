/**
 * Pure server environment validation. No `server-only` import here so it can be
 * unit tested; the guarded entry point is `./index.ts`.
 *
 * Reports variable names and problem kinds only, never values.
 */

type Env = Record<string, string | undefined>;

export type EnvProblem = "missing" | "invalid" | "mock_in_production";

export interface EnvIssue {
  name: string;
  problem: EnvProblem;
}

export type EnvValidation =
  | { ok: true; extractionMode: "mock" | "anthropic" }
  | { ok: false; issues: EnvIssue[] };

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);

export interface ValidateOptions {
  /** True when real users could reach the app (NODE_ENV=production at runtime). */
  production: boolean;
}

export function validateServerEnv(env: Env, { production }: ValidateOptions): EnvValidation {
  const issues: EnvIssue[] = [];
  const get = (name: string) => env[name]?.trim() || undefined;

  const url = get("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) issues.push({ name: "NEXT_PUBLIC_SUPABASE_URL", problem: "missing" });
  else if (!/^https?:\/\/[^\s/]+/.test(url)) {
    issues.push({ name: "NEXT_PUBLIC_SUPABASE_URL", problem: "invalid" });
  }
  if (!get("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    issues.push({ name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", problem: "missing" });
  }

  const rawMode = get("EXTRACTION_MODE")?.toLowerCase();
  let mode: "mock" | "anthropic" = "mock";
  if (rawMode === "anthropic") mode = "anthropic";
  else if (rawMode !== undefined && rawMode !== "mock") {
    issues.push({ name: "EXTRACTION_MODE", problem: "invalid" });
  }

  if (mode === "anthropic" && !get("ANTHROPIC_API_KEY")) {
    issues.push({ name: "ANTHROPIC_API_KEY", problem: "missing" });
  }

  // Mock extraction returns canned data. In production that would show real
  // users someone else's bill, so it must be an explicit, named opt-in.
  const allowMock = TRUE_VALUES.has(get("ALLOW_MOCK_EXTRACTION_IN_PRODUCTION")?.toLowerCase() ?? "");
  if (production && mode === "mock" && !allowMock && !issues.some((i) => i.name === "EXTRACTION_MODE")) {
    issues.push({ name: "EXTRACTION_MODE", problem: "mock_in_production" });
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, extractionMode: mode };
}

/** Names and problem kinds, safe to log. */
export function describeIssues(issues: readonly EnvIssue[]): string {
  return issues.map((i) => `${i.name}: ${i.problem}`).join(", ");
}
