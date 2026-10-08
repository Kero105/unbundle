-- Initial schema. All money amounts are integer cents (bigint, *_cents).
-- Every table has RLS enabled; rows are visible/writable only to their owner.

create table bills (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid not null references auth.users,
  provider_name text,
  service_start date,
  service_end date,
  total_billed_cents bigint,
  insurance_status text,
  status text default 'new'
);

create table bill_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bill_id uuid not null references bills on delete cascade,
  user_id uuid not null references auth.users,
  storage_path text,
  kind text check (kind in ('bill', 'eob')),
  page_count int,
  redacted boolean default false
);

create table line_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bill_id uuid not null references bills on delete cascade,
  user_id uuid not null references auth.users,
  date_of_service date,
  code text,
  code_type text,
  description_raw text,
  units numeric,
  unit_price_cents bigint,
  charge_cents bigint,
  insurance_paid_cents bigint,
  patient_owes_cents bigint,
  source_page int,
  source_box jsonb,
  confidence text,
  user_verified boolean default false
);

create table eob_lines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bill_id uuid not null references bills on delete cascade,
  user_id uuid not null references auth.users,
  date_of_service date,
  code text,
  billed_cents bigint,
  allowed_cents bigint,
  plan_paid_cents bigint,
  patient_responsibility_cents bigint,
  denial_reason text
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bill_id uuid not null references bills on delete cascade,
  user_id uuid not null references auth.users,
  rule_id text,
  line_item_ids uuid[],
  severity text,
  confidence text,
  amount_at_stake_cents bigint,
  evidence text,
  citation text
);

create table letters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bill_id uuid not null references bills on delete cascade,
  user_id uuid not null references auth.users,
  language text,
  pdf_path text,
  sent_at timestamptz
);

create table followups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bill_id uuid not null references bills on delete cascade,
  user_id uuid not null references auth.users,
  due_date date,
  channel text,
  outcome text
);

-- Indexes on the columns RLS and joins filter by.
create index bills_user_id_idx on bills (user_id);
create index bill_files_bill_id_idx on bill_files (bill_id);
create index line_items_bill_id_idx on line_items (bill_id);
create index eob_lines_bill_id_idx on eob_lines (bill_id);
create index findings_bill_id_idx on findings (bill_id);
create index letters_bill_id_idx on letters (bill_id);
create index followups_bill_id_idx on followups (bill_id);

-- Row-level security: owner-only select/insert/update/delete.
-- bills: keyed directly on user_id.
alter table bills enable row level security;

create policy bills_select_own on bills for select to authenticated
  using (user_id = (select auth.uid()));
create policy bills_insert_own on bills for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy bills_update_own on bills for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy bills_delete_own on bills for delete to authenticated
  using (user_id = (select auth.uid()));

-- Child tables: same as bills, and on insert/update bill_id must also
-- reference a bill owned by the caller.
do $$
declare
  t text;
begin
  foreach t in array array[
    'bill_files', 'line_items', 'eob_lines',
    'findings', 'letters', 'followups'
  ]
  loop
    execute format('alter table %I enable row level security', t);

    execute format(
      'create policy %I on %I for select to authenticated
         using (user_id = (select auth.uid()))',
      t || '_select_own', t);

    execute format(
      'create policy %I on %I for insert to authenticated
         with check (
           user_id = (select auth.uid())
           and exists (
             select 1 from bills
             where bills.id = %I.bill_id
               and bills.user_id = (select auth.uid())
           )
         )',
      t || '_insert_own', t, t);

    execute format(
      'create policy %I on %I for update to authenticated
         using (user_id = (select auth.uid()))
         with check (
           user_id = (select auth.uid())
           and exists (
             select 1 from bills
             where bills.id = %I.bill_id
               and bills.user_id = (select auth.uid())
           )
         )',
      t || '_update_own', t, t);

    execute format(
      'create policy %I on %I for delete to authenticated
         using (user_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end
$$;
