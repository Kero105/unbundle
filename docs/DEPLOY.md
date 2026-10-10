# Deploying Unbundle

## Environment variables

| Name | Where set | Public / secret | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Host env (build and runtime), `.env.local` | Public | Also baked into the CSP `connect-src` at build time; rebuild if it changes. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Host env (build and runtime), `.env.local` | Public (publishable key) | Safe in the browser; RLS protects data. |
| `ANTHROPIC_API_KEY` | Host env, server only | **Secret** | Required when `EXTRACTION_MODE=anthropic`. Never prefix with `NEXT_PUBLIC_`. |
| `EXTRACTION_MODE` | Host env | Config | `mock` (default) or `anthropic`. **Must be `anthropic` in production**; the server refuses to start otherwise. |
| `EXTRACTION_ENABLED` | Host env | Config | Kill switch. Unset = on. Anything other than `true`/`1`/`yes`/`on` disables extraction (503). |
| `EXTRACTION_MODEL` | Host env | Config | Optional. Defaults to `claude-sonnet-5-5`. |
| `ALLOW_MOCK_EXTRACTION_IN_PRODUCTION` | Host env | Config | Optional escape hatch for demos or `next start` on a laptop. Leave unset in real production. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Local `.env.local` only** | **Secret** | Used only by `scripts/` (reference-data import, accuracy run). Do not set it on the web host. |

Startup validation lives in `src/lib/env` and `src/instrumentation.ts`; errors name the variable and problem, never the value.

## Database

Apply in order with the Supabase CLI or SQL editor:

1. `supabase/migrations/0001_init.sql` (bills, child tables, RLS)
2. `supabase/migrations/0002_storage.sql` (storage policies)
3. `supabase/migrations/0003_reference.sql` (public reference tables, select-only RLS)
4. `supabase/migrations/0004_bills_flow.sql` (extraction state, rate limit function, `bills` bucket)

Then load reference data locally with the service role key: `node scripts/import-reference.mjs` and `node scripts/import-poverty.mjs --confirm` (both print a dry run first). Confirm `poverty_guidelines` has the current year.

## Supabase Auth

- **Site URL:** `https://<your-domain>`
- **Redirect URLs:** `https://<your-domain>/auth/callback` (add `http://localhost:3000/auth/callback` for development, and any preview domain you use).
- **Providers:** enable Google with the client ID and secret from Google Cloud.

## Google OAuth (Google Cloud console)

- OAuth client type: Web application.
- **Authorized redirect URI:** `https://<project-ref>.supabase.co/auth/v1/callback` (the Supabase project's callback, not the app's).
- **Authorized JavaScript origins:** `https://<your-domain>` (and `http://localhost:3000` for development).
- OAuth consent screen: set app name, privacy policy `https://<your-domain>/privacy` and terms `https://<your-domain>/terms`; publish out of "Testing" before launch or only listed test users can sign in.

## Launch checklist

- [ ] Migrations 0001-0004 applied to the production project; RLS shows enabled on every table.
- [ ] Reference data imported; row counts match the import script's report.
- [ ] `EXTRACTION_MODE=anthropic` set on the host, with `ANTHROPIC_API_KEY`. (Flip from `mock`; the server will not start in production with mock.)
- [ ] `EXTRACTION_ENABLED` unset or `true`; know how to set it `false` as a kill switch.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not set on the host.
- [ ] Auth redirect URLs and Google OAuth settings match the production domain.
- [ ] `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` pass on the release commit.
- [ ] `npm run check:contrast` passes; `npm run accuracy` and `npm run check:live` reviewed (need `.env.local`).
- [ ] Sign in, upload a synthetic bill, extract, review, view report and letter, delete the bill; check the browser console for CSP violations.
- [ ] Privacy copy on the upload card, footer and `/privacy` agree, and Anthropic data-handling wording matches their published terms.
- [ ] Response headers present (`curl -I`): CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] Rotate any key that was ever pasted into a shared terminal or chat.
