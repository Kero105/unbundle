-- DRAFT: not applied. Review before running.
--
-- Manual entry: a signed-in user types a bill's line items instead of the
-- model reading them (extraction failed, or there is no photo).
--
-- What this migration does:
--   1. bills.entry_method records how the rows got there. Not client-writable.
--   2. Closes the INSERT side of the status lock that 0004 applied to UPDATE:
--      a client can no longer insert a bill that is already 'needs_review'.
--   3. submit_manual_bill(): the only way a client moves a bill to
--      needs_review without the model. It validates, writes the rows and
--      flips the status in one transaction.
--
-- The bounds below mirror src/lib/bills/line-item-fields.ts and
-- src/lib/bills/manual-entry.ts; manual-entry.test.ts fails if they drift.

-- ---------------------------------------------------------------------------
-- 1. Column
-- ---------------------------------------------------------------------------
-- Not in the 0004 UPDATE column grant, so a client cannot set it.

alter table bills
  add column entry_method text not null default 'extracted'
    check (entry_method in ('extracted', 'manual'));

-- ---------------------------------------------------------------------------
-- 2. INSERT lock
-- ---------------------------------------------------------------------------
-- 0004 revoked UPDATE on the extraction columns, but INSERT was still
-- table-wide, so a client could insert a row with extraction_status =
-- 'needs_review' directly. Grant back only user_id; every other column takes
-- its default. (The app inserts { user_id } only.)

revoke insert on bills from authenticated;
grant insert (user_id) on bills to authenticated;

-- ---------------------------------------------------------------------------
-- 3. submit_manual_bill(bill_id, header, lines)
-- ---------------------------------------------------------------------------
-- Returns 'submitted' or an opaque rejection code; never echoes content.
--
-- All validation runs before any write. This function returns codes rather
-- than raising, and a return commits, so a rejection after a partial write
-- would keep the partial write.
--
-- header: { providerName, serviceStart, serviceEnd }
-- lines:  [{ dateOfService, code, descriptionRaw, modifiers, units,
--            unitPriceCents, chargeCents }, ...]
--
-- SECURITY DEFINER bypasses RLS, so user_id is set explicitly from
-- auth.uid() on every row written, and the bill is looked up by
-- (id, user_id = uid). The per-bill row lock serializes concurrent calls; no
-- per-user advisory lock is needed because there is no per-user counter here.

create function public.submit_manual_bill(p_bill_id uuid, p_header jsonb, p_lines jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b record;
  max_lines constant int := 100;
  max_modifiers constant int := 8;
  max_cents constant numeric := 1000000000000;
  min_date constant date := date '2000-01-01';
  latest_date constant date := current_date + 1;
  stale_after constant interval := interval '5 minutes';
  header_keys constant text[] := array['providerName', 'serviceStart', 'serviceEnd'];
  line_keys constant text[] := array[
    'dateOfService', 'code', 'descriptionRaw', 'modifiers',
    'units', 'unitPriceCents', 'chargeCents'
  ];
  n int;
  v_provider text;
  v_start date;
  v_end date;
  el jsonb;
  v text;
  num numeric;
  m jsonb;
  seen text[];
begin
  if uid is null then
    return 'unauthenticated';
  end if;

  -- A null id can never match a row; say so rather than rely on the lookup.
  if p_bill_id is null then
    return 'not_found';
  end if;

  -- Shape and size first, so oversized junk never takes a row lock.
  if p_header is null or jsonb_typeof(p_header) <> 'object'
     or p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    return 'bad_payload';
  end if;

  n := jsonb_array_length(p_lines);
  if n = 0 then
    return 'no_lines';
  end if;
  if n > max_lines then
    return 'too_many_lines';
  end if;

  -- Ownership, with the row locked until this transaction ends.
  select id, extraction_status, extraction_started_at, entry_method
    into b
    from public.bills
   where id = p_bill_id and user_id = uid
     for update;

  if not found then
    return 'not_found';
  end if;

  -- Allowed from: pending, failed, a stale extraction, or an earlier manual
  -- entry (so the person can fix a line they forgot). Calling it twice with
  -- the same payload is therefore safe: the second call replaces the rows
  -- (delete, then insert) and ends in the same state.
  if b.extraction_status = 'extracting'
     and b.extraction_started_at > now() - stale_after then
    return 'busy';
  end if;
  if b.extraction_status = 'needs_review' and b.entry_method <> 'manual' then
    return 'already_done';
  end if;

  -- -- Header ---------------------------------------------------------------
  if exists (select 1 from jsonb_object_keys(p_header) k where k <> all (header_keys)) then
    return 'bad_payload';
  end if;

  if jsonb_typeof(p_header -> 'providerName') is distinct from 'string' then
    return 'bad_header';
  end if;
  v_provider := btrim(p_header ->> 'providerName');
  if char_length(v_provider) < 1 or char_length(v_provider) > 200
     or v_provider ~ '[[:cntrl:]]' then
    return 'bad_header';
  end if;

  v := p_header ->> 'serviceStart';
  if jsonb_typeof(p_header -> 'serviceStart') = 'string' then
    if v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return 'bad_date'; end if;
    begin v_start := v::date; exception when others then return 'bad_date'; end;
  elsif coalesce(jsonb_typeof(p_header -> 'serviceStart'), 'null') <> 'null' then
    return 'bad_date';
  end if;

  v := p_header ->> 'serviceEnd';
  if jsonb_typeof(p_header -> 'serviceEnd') = 'string' then
    if v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return 'bad_date'; end if;
    begin v_end := v::date; exception when others then return 'bad_date'; end;
  elsif coalesce(jsonb_typeof(p_header -> 'serviceEnd'), 'null') <> 'null' then
    return 'bad_date';
  end if;

  if (v_start is null) <> (v_end is null) then
    return 'bad_header';
  end if;
  if v_start is not null then
    if v_start > v_end then return 'bad_date'; end if;
    if v_start < min_date or v_end > latest_date then return 'bad_date'; end if;
  end if;

  -- -- Lines ----------------------------------------------------------------
  for el in select value from jsonb_array_elements(p_lines)
  loop
    if jsonb_typeof(el) <> 'object' then
      return 'bad_payload';
    end if;
    if exists (select 1 from jsonb_object_keys(el) k where k <> all (line_keys)) then
      return 'bad_payload';
    end if;

    -- dateOfService: absent/null, or a real date in the window
    if jsonb_typeof(el -> 'dateOfService') = 'string' then
      v := el ->> 'dateOfService';
      if v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return 'bad_date'; end if;
      begin
        if v::date < min_date or v::date > latest_date then return 'bad_date'; end if;
      exception when others then
        return 'bad_date';
      end;
    elsif coalesce(jsonb_typeof(el -> 'dateOfService'), 'null') <> 'null' then
      return 'bad_date';
    end if;

    -- code: absent/null, or already-normalized upper-case alphanumerics
    if jsonb_typeof(el -> 'code') = 'string' then
      if (el ->> 'code') !~ '^[A-Z0-9]{3,10}$' then return 'bad_code'; end if;
    elsif coalesce(jsonb_typeof(el -> 'code'), 'null') <> 'null' then
      return 'bad_code';
    end if;

    -- descriptionRaw: required, trimmed 1..500, no control characters
    if jsonb_typeof(el -> 'descriptionRaw') is distinct from 'string' then
      return 'bad_description';
    end if;
    v := btrim(el ->> 'descriptionRaw');
    if char_length(v) < 1 or char_length(v) > 500 or v ~ '[[:cntrl:]]' then
      return 'bad_description';
    end if;

    -- units: required whole number, 1..100000
    if jsonb_typeof(el -> 'units') is distinct from 'number' then
      return 'bad_units';
    end if;
    num := (el ->> 'units')::numeric;
    if num <> trunc(num) or num < 1 or num > 100000 then
      return 'bad_units';
    end if;

    -- chargeCents: required whole number within +/- 1e12
    if jsonb_typeof(el -> 'chargeCents') is distinct from 'number' then
      return 'bad_cents';
    end if;
    num := (el ->> 'chargeCents')::numeric;
    if num <> trunc(num) or abs(num) > max_cents then
      return 'bad_cents';
    end if;

    -- unitPriceCents: absent/null, or a whole number within +/- 1e12
    if jsonb_typeof(el -> 'unitPriceCents') = 'number' then
      num := (el ->> 'unitPriceCents')::numeric;
      if num <> trunc(num) or abs(num) > max_cents then
        return 'bad_cents';
      end if;
    elsif coalesce(jsonb_typeof(el -> 'unitPriceCents'), 'null') <> 'null' then
      return 'bad_cents';
    end if;

    -- modifiers: absent, or an array of up to 8 distinct two-character codes
    -- (a JSON null is not absent, and is rejected)
    if (el -> 'modifiers') is not null then
      if jsonb_typeof(el -> 'modifiers') <> 'array' then
        return 'bad_modifier';
      end if;
      if jsonb_array_length(el -> 'modifiers') > max_modifiers then
        return 'bad_modifier';
      end if;
      seen := '{}';
      for m in select value from jsonb_array_elements(el -> 'modifiers')
      loop
        if jsonb_typeof(m) <> 'string' or (m #>> '{}') !~ '^[A-Z0-9]{2}$' then
          return 'bad_modifier';
        end if;
        if (m #>> '{}') = any (seen) then
          return 'bad_modifier';
        end if;
        seen := seen || (m #>> '{}');
      end loop;
    end if;
  end loop;

  -- -- Writes (everything above passed) --------------------------------------
  delete from public.line_items where bill_id = p_bill_id and user_id = uid;

  insert into public.line_items (
    bill_id, user_id, sort_order, date_of_service, code, code_type,
    description_raw, modifiers, units, unit_price_cents, charge_cents,
    insurance_paid_cents, patient_owes_cents, source_page, source_box,
    confidence, user_verified
  )
  select
    p_bill_id,
    uid,
    (t.idx - 1)::int,
    nullif(t.el ->> 'dateOfService', '')::date,
    t.el ->> 'code',
    case
      when t.el ->> 'code' is null then null
      when (t.el ->> 'code') ~ '^[0-9]{5}$' or (t.el ->> 'code') ~ '^[0-9]{4}[A-Z]$' then 'CPT'
      when (t.el ->> 'code') ~ '^[A-Z][0-9]{4}$' then 'HCPCS'
      else 'OTHER'
    end,
    btrim(t.el ->> 'descriptionRaw'),
    array(select jsonb_array_elements_text(coalesce(t.el -> 'modifiers', '[]'::jsonb))),
    ((t.el ->> 'units')::numeric),
    ((t.el ->> 'unitPriceCents')::numeric)::bigint,
    ((t.el ->> 'chargeCents')::numeric)::bigint,
    null,
    null,
    1,
    null,
    'high',
    true
  from jsonb_array_elements(p_lines) with ordinality as t(el, idx);

  update public.bills
     set provider_name = v_provider,
         service_start = v_start,
         service_end = v_end,
         total_billed_cents = (
           select coalesce(sum(li.charge_cents), 0)
             from public.line_items li
            where li.bill_id = p_bill_id and li.user_id = uid
         ),
         entry_method = 'manual',
         extraction_status = 'needs_review',
         extraction_error_code = null
   where id = p_bill_id and user_id = uid;

  return 'submitted';
end;
$$;

revoke all on function public.submit_manual_bill(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.submit_manual_bill(uuid, jsonb, jsonb) to authenticated;
