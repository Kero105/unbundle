# Security and privacy review

Reviewed 2026-10-10 by reading the code and migrations. No browser or live-database testing was done.

## Results

| # | Check | Result |
|---|---|---|
| 1 | Logging of bill text, file names, model output, user input | **Pass.** No `console.*` in `src/`. Only `scripts/` log, and they print rule ids, counts and reference-data rows, never bill content. Route handlers return opaque error codes; caught errors are not logged. |
| 2 | Service role / Anthropic key exposure | **Pass.** `SUPABASE_SERVICE_ROLE_KEY` appears only in `scripts/lib/env.mjs` (local import scripts); it is not referenced anywhere in `src/`. `ANTHROPIC_API_KEY` is read only in `src/lib/extraction/config.ts`, reached from `/api/extract`. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public (both designed to be). `.env.local` is gitignored and untracked. |
| 3 | Auth and ownership on routes and actions | **Pass.** `/api/bills`, `/api/bills/[id]/files`, `/api/extract`, and both server actions call `auth.getUser()` and use the user-scoped client; ownership is enforced by RLS and, for extraction, inside `claim_extraction()` (`user_id = auth.uid()`). IDs are validated as UUIDs. Protected pages are also gated by the proxy using `getUser()`. `/auth/callback` only redirects to same-site relative paths. |
| 4 | RLS | **Pass, no table without RLS.** `bills` and the six child tables (0001), six reference tables (0003, select for `authenticated` only), `extraction_runs` (0004, select-own only; written only through the security-definer function). Child-table insert/update policies also require the parent bill to be owned by the caller. 0004 revokes client UPDATE on extraction state columns. Storage: select/insert/delete scoped to `{uid}/` (no update policy by design). |
| 5 | Security headers | **Added** in `next.config.ts` (see below). |
| 6 | Extraction route limits | **Pass.** Request body is only `{billId}` (strict schema). Rate limit: 5 runs per user per rolling hour, enforced atomically in the database with an advisory lock; one concurrent run per bill. Kill switch `EXTRACTION_ENABLED` and fail-closed config. Upload route: 10 MB file cap (checked from content-length and again on bytes), magic-byte type check, 6-page PDF cap, 50 bills per user. Bucket also caps size and MIME types. |
| 7 | File names in storage paths | **Pass.** Path is `{user_id}/{bill_id}/{random uuid}.{ext}` where the extension comes from detected magic bytes. The client file name is never read. |

## Headers added

`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=()`, `X-Frame-Options: DENY` plus CSP `frame-ancestors 'none'`. Verified on a production build with `curl -I`.

CSP: same-origin by default; `connect-src` adds the Supabase origin (https and wss) read from `NEXT_PUBLIC_SUPABASE_URL` at build time; `img-src` allows `blob:`/`data:` for upload previews; `worker-src blob:`. `script-src` and `style-src` include `'unsafe-inline'` because the app uses Partial Prerendering, which Next documents as incompatible with nonce-based CSP.

## Needs your decision / not verified

1. **`'unsafe-inline'` scripts.** Weakens XSS protection. Strict CSP would require dropping PPR/`cacheComponents` for dynamic rendering, or Next's experimental SRI hash mode. Recommend accepting for launch.
2. **CSP not exercised in a browser.** Sign-in, upload preview and image compression (canvas, blob URLs, possibly `createImageBitmap`) should be clicked through once on a deployed build; check the console for CSP violations. If the Supabase URL changes, rebuild.
3. **Camera.** `camera=(self)` allows the upload page's camera capture; no other powers are granted.
4. **Upload rate limiting.** Only extraction is rate-limited per hour. Uploads are bounded by the 50-bill cap and one file per kind per bill, but a user could create and delete bills repeatedly. Low risk; add a limit if abuse appears.
5. **Local secrets.** `.env.local` holds real keys on this machine. They were echoed once into this session's terminal output by an over-broad grep during this review. Rotate the Anthropic and Supabase service keys if this transcript is stored or shared.
6. **Dashboard-only settings** (Auth redirect URLs, bucket exists via migration 0004) cannot be verified from code; see DEPLOY.md once written.
