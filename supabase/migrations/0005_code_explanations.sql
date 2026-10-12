-- Plain-language code explanations ("What is this?").
--
--   1. code_explanations: a shared cache of model-written, general
--      explanations per billing code and language. Holds NO user data. RLS is
--      on; authenticated users can only select. There are no insert, update
--      or delete policies, so rows can only be written with the service role,
--      which only `npm run explain:prefill` (local, offline) does.
--   2. extraction_runs.kind + claim_explanation(): explanations draw from the
--      same per-user hourly budget table as extraction, so one user cannot
--      spend more than a fixed number of paid model calls per hour in total.
--      claim_extraction() is redefined only to count its own kind, so
--      explanation calls never use up the 5 extraction runs per hour.

-- ---------------------------------------------------------------------------
-- 1. Cache
-- ---------------------------------------------------------------------------

create table code_explanations (
  code text not null check (code ~ '^[0-9A-Z]{5}$'),
  language text not null check (language in ('en', 'es')),
  text text not null check (char_length(text) between 20 and 600),
  created_at timestamptz not null default now(),
  primary key (code, language)
);

alter table code_explanations enable row level security;

create policy code_explanations_select_authenticated on code_explanations
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. Shared per-user budget
-- ---------------------------------------------------------------------------

alter table extraction_runs
  add column kind text not null default 'extraction'
    check (kind in ('extraction', 'explanation'));

-- Combined cap across kinds, per rolling hour. Extraction keeps its own cap of 5.
create function claim_explanation()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  recent int;
  max_total constant int := 100;
  run_window constant interval := interval '1 hour';
begin
  if uid is null then
    return 'unauthenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select count(*) into recent
    from public.extraction_runs
   where user_id = uid and created_at > now() - run_window;

  if recent >= max_total then
    return 'rate_limited';
  end if;

  insert into public.extraction_runs (user_id, bill_id, kind)
  values (uid, null, 'explanation');

  return 'claimed';
end;
$$;

revoke all on function claim_explanation() from public, anon;
grant execute on function claim_explanation() to authenticated;

-- claim_extraction(): identical to 0004 except the hourly count only looks at
-- kind = 'extraction', and an extraction also respects the combined cap.
create or replace function claim_extraction(p_bill_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b record;
  recent int;
  recent_total int;
  max_runs constant int := 5;
  max_total constant int := 100;
  run_window constant interval := interval '1 hour';
  stale_after constant interval := interval '5 minutes';
begin
  if uid is null then
    return 'unauthenticated';
  end if;

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

  select count(*) filter (where kind = 'extraction'), count(*)
    into recent, recent_total
    from public.extraction_runs
   where user_id = uid and created_at > now() - run_window;

  if recent >= max_runs or recent_total >= max_total then
    return 'rate_limited';
  end if;

  insert into public.extraction_runs (user_id, bill_id, kind)
  values (uid, p_bill_id, 'extraction');

  update public.bills
     set extraction_status = 'extracting',
         extraction_started_at = now(),
         extraction_error_code = null
   where id = p_bill_id;

  return 'claimed';
end;
$$;

revoke all on function public.claim_extraction(uuid) from public, anon;
grant execute on function public.claim_extraction(uuid) to authenticated;
