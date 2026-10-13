# Security and privacy review

Reviewed 2026-10-10 by reading the code and migrations. No browser or live-database testing was done.

## Results

| # | Check | Result |
|---|---|---|
| 1 | Logging of bill text, file names, model output, user input | **Pass.** No `console.*` in `src/`. Only `scripts/` log, and they print rule ids, counts and reference-data rows, never bill content. Route handlers return opaque error codes; caught errors are not logged. |
| 2 | Service role / Anthropic key exposure | **Pass, with one documented exception.** `SUPABASE_SERVICE_ROLE_KEY` is read in exactly two places: `scripts/lib/env.mjs` (local import scripts) and `src/lib/account/admin.ts`, which `import "server-only"` and uses it solely to delete the caller's own auth user for "Delete my account". It is never imported by a client component or returned in a response. In production it must be set only on the production environment, marked Sensitive (see DEPLOY.md). `ANTHROPIC_API_KEY` is read only in `src/lib/extraction/config.ts`, reached from `/api/extract`. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public (both designed to be). `.env.local` is gitignored and untracked. |
| 3 | Auth and ownership on routes and actions | **Pass.** `/api/bills`, `/api/bills/[id]/files`, `/api/extract`, and both server actions call `auth.getUser()` and use the user-scoped client; ownership is enforced by RLS and, for extraction, inside `claim_extraction()` (`user_id = auth.uid()`). IDs are validated as UUIDs. Protected pages are also gated by the proxy using `getUser()`. `/auth/callback` only redirects to same-site relative paths. |
| 4 | RLS | **Pass, no table without RLS.** `bills` and the six child tables (0001), six reference tables (0003, select for `authenticated` only), `extraction_runs` (0004, select-own only; written only through the security-definer function). Child-table insert/update policies also require the parent bill to be owned by the caller. 0004 revokes client UPDATE on extraction state columns. Storage: select/insert/delete scoped to `{uid}/` (no update policy by design). |
| 5 | Security headers | **Added** in `next.config.ts` (see below). |
| 6 | Extraction route limits | **Pass.** Request body is only `{billId}` (strict schema). Rate limit: 5 runs per user per rolling hour, enforced atomically in the database with an advisory lock; one concurrent run per bill. Kill switch `EXTRACTION_ENABLED` and fail-closed config. Upload route: 10 MB file cap (checked from content-length and again on bytes), magic-byte type check, 6-page PDF cap, 50 bills per user. Bucket also caps size and MIME types. |
| 7 | File names in storage paths | **Pass.** Path is `{user_id}/{bill_id}/{random uuid}.{ext}` where the extension comes from detected magic bytes. The client file name is never read. |

## Manual entry (migration 0006, draft, not yet applied)

Reviewed 2026-10-13 by reading `0006_manual_entry.sql` and the code that calls it. The SQL has not been executed; `docs/manual-entry-test.md` is the checklist that does that.

- **New write path.** `submit_manual_bill(bill_id, header, lines)` is the only way a client moves a bill to `needs_review` without the model. It is `security definer`, `search_path = ''`, executable by `authenticated` only, and uses no dynamic SQL. It checks `auth.uid()`, then ownership with a row lock, then validates every field (line count, dates, integer cents, code format, modifiers, text, unknown keys) before its first write, because it returns codes rather than raising and a return commits.
- **INSERT gap closed.** 0004 locked the extraction status columns against UPDATE only. INSERT on `bills` was still table-wide, so a client could insert a bill that was already `needs_review`. 0006 revokes INSERT and grants back `(user_id)` only.
- **No new model exposure.** Manual entry never calls Anthropic. Code explanations send only the billing code, not the line description (`explain-actions.ts` accepts `{ code, demo }` under a strict schema, and `explain/server.ts` passes only `code` and `language`). A `description` parameter still exists in `explain/service.ts` and `prompt.ts` but no caller sets it.
- **Residual race, not fixed.**
  - *What:* if an extraction run is still going when its bill passes the 5-minute stale threshold and the user then submits by hand, the late run can write over the typed data. `saveResult()` in `src/lib/extraction/supabase-store.ts` deletes and re-inserts `line_items` and updates the bill header before it calls `finish_extraction()`, and that call is what refuses (`not_extracting`) because the bill is no longer `extracting`.
  - *Result:* the typed rows and header are replaced by the extracted ones while the bill stays `needs_review` with `entry_method = 'manual'`. No data leaves the user's own account, and the review screen still shows what is stored. The row confidences come from the model, so low-confidence rows ask for review as usual.
  - *Likelihood:* very low. A run has `maxDuration = 120` seconds, well under the 5-minute stale window, so it only happens if that limit is raised or the host ignores it.
  - *Fix when wanted:* have `saveResult()` confirm the bill is still `extracting` (or do the writes inside a database function that checks) before it deletes anything.
- **Not verified.** The function's behaviour against a real database, including the INSERT revoke against the upload flow. Run the checklist before applying 0006 to production.

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
