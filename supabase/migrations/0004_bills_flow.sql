-- DRAFT, not applied. Upload + extraction flow.
--
-- What 0001 already gives us (verified, not repeated here):
--   * RLS enabled on bills, bill_files, line_items, eob_lines (and the rest).
--   * Policies scoped to user_id = auth.uid(); on insert AND update, the child
--     tables also require bill_id to reference a bill owned by the caller.
--   * Money columns are bigint cents; source_page and source_box exist.
--
-- What this migration adds:
--   1. Extraction state on bills and the missing columns on line_items.
--   2. Constraints that keep stored paths and enums honest.
--   3. extraction_runs + claim_extraction(): an atomic, server-side rate limit
--      and "one extraction at a time" lock that a client cannot widen.
--   4. The private `bills` storage bucket (idempotent), 10 MB, image/PDF only.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

alter table bills
  add column extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'extracting', 'needs_review', 'failed')),
  -- Opaque code only (e.g. 'invalid_output'). Never model output or bill text.
  add column extraction_error_code text,
  add column extraction_started_at timestamptz;

alter table line_items
  add column modifiers text[] not null default '{}',
  -- Keeps rows in the order they appear on the bill.
  add column sort_order int not null default 0;

alter table line_items
  alter column units set default 1,
  alter column user_verified set not null,
  add constraint line_items_confidence_check
    check (confidence is null or confidence in ('high', 'medium', 'low')),
  add constraint line_items_code_type_check
    check (code_type is null or code_type in ('CPT', 'HCPCS', 'REVENUE', 'DRG', 'OTHER')),
  add constraint line_items_units_check check (units is null or units > 0);

alter table eob_lines
  add column sort_order int not null default 0;

alter table bill_files
  add column mime_type text,
  add column size_bytes int,
  alter column kind set not null,
  alter column storage_path set not null,
  -- The object path must be {user_id}/{bill_id}/... so a row can never point at
  -- another user's file. (The storage policies enforce the same folder rule.)
  add constraint bill_files_path_check
    check (storage_path like user_id::text || '/' || bill_id::text || '/%');

-- At most one bill file and one EOB per bill.
create unique index bill_files_bill_kind_key on bill_files (bill_id, kind);

create index line_items_bill_sort_idx on line_items (bill_id, sort_order);
create index eob_lines_bill_sort_idx on eob_lines (bill_id, sort_order);

-- ---------------------------------------------------------------------------
-- 2. Extraction usage (rate limit)
-- ---------------------------------------------------------------------------
-- One row per extraction attempt. No bill content, only who and when.
-- Rows are written only by claim_extraction(); there is no insert/update/delete
-- policy, so a client cannot add, remove or backdate rows.

create table extraction_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users on delete cascade,
  bill_id uuid references bills on delete set null
);

create index extraction_runs_user_created_idx
  on extraction_runs (user_id, created_at desc);

alter table extraction_runs enable row level security;

create policy extraction_runs_select_own on extraction_runs
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. claim_extraction(bill_id)
-- ---------------------------------------------------------------------------
-- Called by the server route before it spends anything. In one transaction:
--   * the bill must belong to the caller,
--   * a finished bill is not re-extracted (that would overwrite user edits),
--   * a bill already being extracted (started < 5 minutes ago) is 'busy',
--   * at most 5 extractions per user per rolling hour,
--   * otherwise record the run and mark the bill 'extracting'.
-- The limit is a constant here, not a parameter: the function is callable by any
-- signed-in client, so a caller-supplied limit would be no limit at all.
-- SECURITY DEFINER is needed only to write extraction_runs; it always filters
-- by auth.uid() and pins search_path.

create function claim_extraction(p_bill_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b record;
  recent int;
  max_runs constant int := 5;
  run_window constant interval := interval '1 hour';
  stale_after constant interval := interval '5 minutes';
begin
  if uid is null then
    return 'unauthenticated';
  end if;

  -- Serialize this user's claims so concurrent calls cannot both pass the count.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select id, extraction_status, extraction_started_at
    into b
    from public.bills
   where id = p_bill_id and user_id = uid
     for update;

  if not found then
    return 'not_found';
  end if;

  if b.extraction_status = 'needs_review' then
    return 'already_done';
  end if;

  if b.extraction_status = 'extracting'
     and b.extraction_started_at > now() - stale_after then
    return 'busy';
  end if;

  select count(*) into recent
    from public.extraction_runs
   where user_id = uid and created_at > now() - run_window;

  if recent >= max_runs then
    return 'rate_limited';
  end if;

  insert into public.extraction_runs (user_id, bill_id) values (uid, p_bill_id);

  update public.bills
     set extraction_status = 'extracting',
         extraction_started_at = now(),
         extraction_error_code = null
   where id = p_bill_id;

  return 'claimed';
end;
$$;

revoke all on function claim_extraction(uuid) from public, anon;
grant execute on function claim_extraction(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3b. Lock the extraction state columns
-- ---------------------------------------------------------------------------
-- The bills update policy is row-scoped, so without a column restriction a
-- signed-in client could set extraction_status = 'needs_review' on a bill that
-- was never read, or clear extraction_started_at to dodge the lock. Status only
-- moves through claim_extraction() and finish_extraction().
-- Column-level revokes are no-ops while a table-level UPDATE grant exists, so
-- revoke the table-level privilege and grant back the user-editable columns.
-- (user_id, id and created_at are intentionally not re-granted.)

revoke update on bills from authenticated;
revoke update (extraction_status, extraction_error_code, extraction_started_at)
  on bills from authenticated;
grant update (provider_name, service_start, service_end, total_billed_cents, insurance_status, status)
  on bills to authenticated;

-- ---------------------------------------------------------------------------
-- 3c. finish_extraction(bill_id, status, error_code)
-- ---------------------------------------------------------------------------
-- The only way for a client session to leave 'extracting'. Allowed only for the
-- owner, only to 'needs_review' or 'failed', and only while the bill is
-- currently 'extracting'. Returns 'finished' or a rejection code.

create function finish_extraction(p_bill_id uuid, p_status text, p_error_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_status text;
begin
  if uid is null then
    return 'unauthenticated';
  end if;

  if p_status is null or p_status not in ('needs_review', 'failed') then
    return 'invalid_status';
  end if;

  select extraction_status into current_status
    from public.bills
   where id = p_bill_id and user_id = uid
     for update;

  if not found then
    return 'not_found';
  end if;

  if current_status <> 'extracting' then
    return 'not_extracting';
  end if;

  update public.bills
     set extraction_status = p_status,
         extraction_error_code = case when p_status = 'failed' then p_error_code else null end
   where id = p_bill_id and user_id = uid;

  return 'finished';
end;
$$;

revoke all on function finish_extraction(uuid, text, text) from public, anon;
grant execute on function finish_extraction(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Storage bucket
-- ---------------------------------------------------------------------------
-- Private bucket. Per-user object policies live in 0002_storage.sql.
-- Safe to run if the bucket was already created in the dashboard.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bills', 'bills', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
