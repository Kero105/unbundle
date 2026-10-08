@AGENTS.md

# Unbundle

Unbundle audits medical bills. A user uploads a bill, we extract structured line items, run deterministic checks for errors and overcharges, and explain the findings in plain language (English and Spanish), with a downloadable PDF report.

## Stack

- Next.js (App Router), TypeScript, Tailwind, shadcn/ui. Next.js here is a newer version than you know; follow AGENTS.md and read `node_modules/next/dist/docs/` before writing Next code.
- Supabase: Google auth, Postgres, storage
- Anthropic SDK: extraction and explanations only
- Zod: validation of every external boundary (LLM output, request bodies, DB rows)
- next-intl: `en` and `es`
- `@react-pdf/renderer`: report generation
- Vitest: tests

Not every dependency is installed yet. `package.json` is the source of truth for what exists; add a dependency when the feature needs it.

## Commands

- `npm run dev` / `npm run build` / `npm run lint`
- `npx vitest run` for tests (add a `test` script to package.json when Vitest is installed)
- `npx tsc --noEmit` for type checks

Run lint, type check, and tests before committing.

## Non-negotiable rules

1. **Claude never decides findings.** The Anthropic API is used only to (a) extract data from a bill into a Zod-validated schema and (b) write plain-language explanations of findings that already exist. Every finding (duplicate charge, unbundling, wrong quantity, etc.) is produced by deterministic code in `src/lib/rules`. Never prompt the model to "find errors" or let model output create, drop, or change a finding. Explanation prompts receive the finding as input and must not alter its facts or amounts.
2. **Every rule has unit tests.** A new or changed rule in `src/lib/rules` ships with Vitest tests in the same commit: at least one case that fires, one that doesn't, and relevant edge cases (empty input, zero/negative amounts, boundary values).
3. **Never log or print bill contents or personal data.** No `console.log`, error messages, analytics, or test output containing bill text, line items, names, dates of birth, member/account IDs, or addresses. Log opaque IDs and error codes only. Use synthetic fixtures in tests, never real bills.
4. **Row-level security on every table, keyed on `user_id`.** Every migration that creates a table enables RLS and adds policies scoping select/insert/update/delete to `auth.uid() = user_id`. Storage buckets get equivalent per-user policies. Never ship a table without them.
5. **Secrets stay server-side.** `ANTHROPIC_API_KEY` and the Supabase service role key are used only in server code (route handlers, server actions, server components). Never prefix them with `NEXT_PUBLIC_`, never import them from a client component, and never return them in a response. Prefer the user-scoped Supabase client; use the service role only when strictly necessary. `.env.local` is never committed.
6. **Small, focused commits.** One logical change per commit, with a clear message. Don't mix refactors with features, or migrations with unrelated UI.

## Architecture conventions

- `src/lib/rules/`: pure, deterministic functions. Input: normalized bill data. Output: findings. No network, no clock, no randomness, no LLM calls.
- Extraction output is validated with Zod before it reaches the rules. Reject or flag malformed extractions; don't guess.
- Findings carry stable codes and structured data; user-facing text comes from next-intl messages or the explanation step, not hardcoded in rules.
- All user-facing strings go through next-intl with both `en` and `es` entries. Don't hardcode copy in components.
- Default to server components; add `"use client"` only where interactivity requires it.
- Money: use integer cents, never floats.
- Use shadcn/ui components before writing custom ones.

## Existing pages

`src/app/privacy` and `src/app/terms` exist. Keep them accurate if data handling changes (e.g., what is stored, retention, third-party processors).
