# Manual entry: test checklist

Migration `0006_manual_entry.sql` is a **draft**. Nobody has run it. This checklist is how it earns being applied. It needs two throwaway accounts and synthetic data only.

**Where to run it:** a staging or local Supabase project, never production. Apply migrations 0001 to 0006 there first. Throwaway means two Google accounts you will not mind deleting, called **A** and **B** below.

**Rules:** type only the made-up lines in this file. Never a real bill. Do not paste results that contain real names or amounts anywhere.

The unit tests (`npx vitest run`) already cover the TypeScript side and check that the SQL text contains each guard before its first write. They do not run the SQL. Part 1 does.

---

## Part 1: the database function

Run these in the SQL editor of the staging project. Each block impersonates a signed-in user inside a transaction and rolls back, so nothing stays.

Find the two user ids first:

```sql
select id, email from auth.users order by created_at desc limit 5;
```

Use this wrapper for every case, replacing `<A>` with account A's id:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '<A>', 'role', 'authenticated')::text, true);

-- a bill owned by A
insert into bills (user_id) values ('<A>') returning id;   -- note the id as <BILL>

-- case goes here

rollback;
```

A good payload to start from (synthetic):

```sql
select public.submit_manual_bill(
  '<BILL>',
  '{"providerName":"Synthetic Clinic","serviceStart":"2026-10-02","serviceEnd":"2026-10-02"}',
  '[{"dateOfService":"2026-10-02","code":"99214","descriptionRaw":"SYNTHETIC VISIT","modifiers":[],"units":1,"unitPriceCents":22000,"chargeCents":22000}]'
);
```

### 1.1 Permissions

| # | Check | Expected |
|---|---|---|
| P1 | `select has_function_privilege('anon', 'public.submit_manual_bill(uuid,jsonb,jsonb)', 'execute');` | `false` |
| P2 | Same with `'authenticated'` | `true` |
| P3 | `select has_column_privilege('authenticated', 'public.bills', 'extraction_status', 'insert');` | `false` |
| P4 | `select has_column_privilege('authenticated', 'public.bills', 'entry_method', 'insert');` and again with `'update'` | `false`, `false` |
| P5 | `select has_column_privilege('authenticated', 'public.bills', 'user_id', 'insert');` | `true` |
| P6 | As A: `insert into bills (user_id, extraction_status) values ('<A>', 'needs_review');` | `permission denied` |
| P7 | As A: `insert into bills (user_id, entry_method) values ('<A>', 'manual');` | `permission denied` |
| P8 | As A: `update bills set extraction_status = 'needs_review' where id = '<BILL>';` | `permission denied` |
| P9 | With `set local role anon` instead of `authenticated`, call the good payload | `permission denied` |

### 1.2 Who and which bill

| # | Check | Expected |
|---|---|---|
| W1 | Good payload as A on A's bill | `submitted` |
| W2 | Call the good payload **twice in a row** | `submitted` both times; `select count(*) from line_items where bill_id = '<BILL>'` is still `1` |
| W3 | As **B** (put B's id in `set_config`), call the good payload with **A's** bill id | `not_found`; A's bill is unchanged (`extraction_status` is still `pending`, no rows) |
| W4 | A random uuid, e.g. `'00000000-0000-4000-8000-000000000000'` | `not_found` |
| W5 | `null` as the bill id | `not_found` |
| W6 | No session at all (`set local role authenticated` without the `set_config` line) | `unauthenticated` |

### 1.3 Bill state

Setting state needs the table owner, so for these cases set it **before** the `set local role` line, in the same transaction.

| # | Setup (as owner) | Expected |
|---|---|---|
| S1 | `update bills set extraction_status = 'extracting', extraction_started_at = now() where id = '<BILL>';` | `busy` |
| S2 | Same but `extraction_started_at = now() - interval '10 minutes'` | `submitted` |
| S3 | `update bills set extraction_status = 'needs_review' where id = '<BILL>';` (`entry_method` stays `extracted`) | `already_done`, rows unchanged |
| S4 | `update bills set extraction_status = 'needs_review', entry_method = 'manual' where id = '<BILL>';` | `submitted` (re-entry allowed) |
| S5 | `update bills set extraction_status = 'failed', extraction_error_code = 'invalid_output' where id = '<BILL>';` | `submitted`, and `extraction_error_code` is now `null` |

### 1.4 Hostile payloads

Run each against a `pending` bill as A. Replace the argument named; keep the rest of the good payload.

| # | Change | Expected |
|---|---|---|
| H1 | lines = `null` (SQL null) | `bad_payload` |
| H2 | lines = `'"x"'` | `bad_payload` |
| H3 | lines = `'{"a":1}'` | `bad_payload` |
| H4 | lines = `'[]'` | `no_lines` |
| H5 | lines = an array of **101** valid lines | `too_many_lines` |
| H6 | lines = an array of **100** valid lines | `submitted` |
| H7 | header = `null` | `bad_payload` |
| H8 | header = `'[]'` | `bad_payload` |
| H9 | header with an extra key `"totalBilledCents":1` | `bad_payload` |
| H10 | header `providerName` missing, `""`, `"   "`, 201 characters, or a number | `bad_header` |
| H11 | only `serviceStart` set | `bad_header` |
| H12 | `serviceStart` after `serviceEnd` | `bad_date` |
| H13 | `serviceStart` and `serviceEnd` both set to `"2026-02-30"`, `"10/02/2026"`, `"1999-12-31"`, or a date 3 days from now (one case each) | `bad_date` |
| H14 | a line that is `"x"`, `1`, or `[]` | `bad_payload` |
| H15 | a line with an extra key `"confidence":"low"` or `"userId":"..."` | `bad_payload` |
| H16 | `dateOfService` an object or array | `bad_date` |
| H17 | `code` an array, or `"99-213"`, `"ab"`, `"99213 "`, `"j3490"` (lower case) | `bad_code` |
| H18 | `descriptionRaw` missing, `""`, an object, 501 characters, or containing a newline | `bad_description` |
| H19 | `units` `"1"` (string), `1.5`, `0`, `-1`, `100001`, `[1]` | `bad_units` |
| H20 | `chargeCents` `"100"` (string), `10.5`, `1e13`, `-1e13`, `{"a":1}`, missing | `bad_cents` |
| H21 | `unitPriceCents` `"5"`, `0.5`, `1e13`, `[1]` | `bad_cents` |
| H22 | `modifiers` `null`, `"25"`, `{"a":1}`, `["5"]`, `["abc"]`, `["xs"]`, `["25","25"]`, 9 entries, `[["25"]]` | `bad_modifier` |
| H23 | a negative `chargeCents` (a credit) such as `-500` | `submitted` |
| H24 | `unitPriceCents` `null` and `dateOfService` `null` and `code` `null` | `submitted` |

### 1.5 All or nothing

| # | Check | Expected |
|---|---|---|
| A1 | On a bill that already holds rows from an earlier `submitted`, send a valid first line and an invalid second line | the invalid code; the two original rows are still there, none added, and the bill's status and provider are unchanged |
| A2 | After a `submitted`, check the bill | `extraction_status = 'needs_review'`, `entry_method = 'manual'`, `total_billed_cents` equals the sum of the charges |
| A3 | Check the rows | `user_id` is A, `confidence = 'high'`, `user_verified = true`, `source_box is null`, `source_page = 1`, `sort_order` is `0, 1, 2...` |
| A4 | `code_type` for codes `99214`, `0042T`, `J3490`, `0450`, `470` | `CPT`, `CPT`, `HCPCS`, `OTHER`, `OTHER` |

---

## Part 2: the app

Run with the staging build, signed in as A, then B where it says so. English first, then repeat U2 in Spanish.

| # | Steps | Expected |
|---|---|---|
| U1 | Signed out, open `/bills/new/manual` and `/bills/00000000-0000-4000-8000-000000000000/enter` | Redirected to sign-in both times |
| U2 | Signed in, upload page, click **No photo? Type in your bill instead.** Type the lines in section "Fixture lines" below, press **Continue to review** | Lands on review. A note says you typed the bill in. There is no original-bill panel and no "Show on bill" buttons. All rows count as verified. |
| U3 | **Continue** to the report | Exactly one finding: duplicate charge for `93000`, **$50.00**. The note that the checks used only what you typed is shown. |
| U4 | Make the letter, and open the printable summary | Both open and show the same finding; the summary carries the same note |
| U5 | Back on review, click **Edit the lines you typed**, change one charge, remove one line, add one, continue | Rows are replaced, not doubled; the report reflects the change |
| U6 | Set `EXTRACTION_ENABLED=false` (or use a bad key), upload a synthetic image from `fixtures/images` | Error page offers **Or type in your bill by hand instead.** Clicking it opens the entry screen for the **same** bill (no second bill on the dashboard) |
| U7 | Type the lines and continue | Review shows your uploaded file beside the rows, with a note that typed rows aren't linked to a spot on it. Selecting a row never says "couldn't pinpoint". |
| U8 | Dashboard | A failed bill shows **Try reading again** and **Type it in by hand**; an unfinished upload shows **Type it in by hand** |
| U9 | As **B**, open A's `/bills/<id>/enter` and `/bills/<id>/review` | Not found, both times |
| U10 | Open `/bills/<id>/enter` for a bill that was read from an upload and is in review | Redirects to its review page |
| U11 | (Hard to hit; optional.) Open `/bills/<id>/enter` while that bill is being read | Says to give it a minute; no form |
| U12 | Type 100 lines (add a line 99 times) | The add button disables and says you can add up to 100 |
| U13 | Delete a typed bill from the dashboard | It disappears from the dashboard. In the SQL editor, `select count(*) from line_items where bill_id = '<id>'` is `0` |
| U14 | Upload a real synthetic image and let extraction run end to end | Works as before (regression check for the INSERT lock on `bills`) |
| U15 | Type, then refresh the page before continuing | The browser asks before leaving; nothing you typed is in local or session storage (DevTools, Application tab) |
| U16 | Open the network tab while submitting | The only request carrying your lines is the server action; nothing goes to `anthropic.com` |
| U17 | Open **What is this?** on a typed row | Works; the request carries only the code |
| U18 | Read the upload card, the footer and `/privacy` | They agree: typed bills are not sent to Anthropic; only a billing code is, and only on "What is this?" |
| U19 | Check the browser console on every page above | No CSP violations |

### Fixture lines

Provider: **Westlake Terrace Family Medicine**. First and last date of service: **2026-10-02**. These are the lines of `fixtures/bills/bill-01-duplicate-charge.json`.

| Date | Code | Description | Units | Unit price | Charge | Modifiers |
|---|---|---|---|---|---|---|
| 2026-10-02 | 99214 | OFFICE O/P VISIT EST LEVL 4 | 1 | 220.00 | 220.00 | |
| 2026-10-02 | 93000 | ECG ROUTINE W/ INTERP & REPORT | 1 | 50.00 | 50.00 | |
| 2026-10-02 | 93000 | ECG ROUTINE W/ INTERP & REPORT | 1 | 50.00 | 50.00 | |
| 2026-10-02 | 80061 | LIPID PANEL | 1 | 42.00 | 42.00 | |
| 2026-10-02 | 36415 | VENIPUNCTURE ROUTINE | 1 | 18.00 | 18.00 | |
| 2026-10-02 | 84443 | ASSAY THYROID STIM HORMONE | 1 | 55.00 | 55.00 | |

Expected total: **$435.00**.

---

## Results

Fill in and keep with the release notes.

| Part | Run by | Date | Result | Notes |
|---|---|---|---|---|
| 1.1 Permissions | | | | |
| 1.2 Who and which bill | | | | |
| 1.3 Bill state | | | | |
| 1.4 Hostile payloads | | | | |
| 1.5 All or nothing | | | | |
| 2 App | | | | |

## Before applying to production

1. Every row above passes on staging.
2. Apply `0006_manual_entry.sql` to production **before** deploying this code. The code works without the migration (the entry-method read fails safe to "extracted", and submitting reports a save error), but the new screens do nothing useful until it is applied.
3. Remove the `DRAFT` header from the migration in the same commit that records the results.
4. Re-run P1 to P9 on production (they change nothing).
