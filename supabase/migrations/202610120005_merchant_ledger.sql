-- Manual account reconciliation. These entries are declarations by an admin,
-- not proof that Wave executed a transaction.
create table public.merchant_ledger_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  merchant_id text not null,
  kind text not null check (kind in ('opening', 'receipt', 'disbursement', 'fee', 'refund', 'transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out')),
  amount numeric(12, 2) not null check (amount > 0),
  occurred_on date not null,
  description text not null check (length(btrim(description)) between 1 and 500),
  external_reference text,
  recorded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index one_opening_per_merchant on public.merchant_ledger_entries(organization_id, merchant_id)
  where kind = 'opening';
create index merchant_ledger_account_date on public.merchant_ledger_entries(organization_id, merchant_id, occurred_on desc, created_at desc);
alter table public.merchant_ledger_entries enable row level security;
revoke all on public.merchant_ledger_entries from public, anon, authenticated;
grant select on public.merchant_ledger_entries to authenticated, service_role;
create policy "association admins read merchant ledger" on public.merchant_ledger_entries
  for select to authenticated using (public.is_active_admin_for_organization(auth.uid(), organization_id));

create function public.prevent_merchant_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Merchant ledger entries are immutable; record a correcting entry' using errcode = '23514';
end;
$$;
create trigger merchant_ledger_immutable before update or delete on public.merchant_ledger_entries
  for each row execute function public.prevent_merchant_ledger_mutation();

create function public.get_admin_merchant_ledger()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare association_id uuid; result jsonb;
begin
  select u.organization_id into association_id from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if association_id is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  with account_ids as (
    select wave_merchant_id as merchant_id from public.organizations where id = association_id
    union select old_merchant_id from public.wave_merchant_change_requests
      where organization_id = association_id and status = 'applied'
    union select new_merchant_id from public.wave_merchant_change_requests
      where organization_id = association_id and status = 'applied'
  ), accounts as (
    select a.merchant_id, a.merchant_id = o.wave_merchant_id as current,
      coalesce(sum(case when e.kind in ('opening','receipt','refund','transfer_in','adjustment_in')
        then e.amount else -e.amount end), 0) as calculated_balance,
      count(e.id) as movement_count
    from account_ids a cross join public.organizations o
    left join public.merchant_ledger_entries e on e.organization_id = association_id and e.merchant_id = a.merchant_id
    where a.merchant_id is not null and o.id = association_id
    group by a.merchant_id, o.wave_merchant_id
  )
  select jsonb_build_object(
    'accounts', coalesce((select jsonb_agg(jsonb_build_object('merchantId', merchant_id,
      'current', current, 'calculatedBalance', calculated_balance,
      'movementCount', movement_count) order by current desc, merchant_id) from accounts), '[]'::jsonb),
    'movements', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'merchantId', e.merchant_id,
      'kind', e.kind, 'amount', e.amount, 'occurredOn', e.occurred_on,
      'description', e.description, 'reference', e.external_reference,
      'recordedAt', e.created_at) order by e.occurred_on desc, e.created_at desc)
      from (select * from public.merchant_ledger_entries where organization_id = association_id
        order by occurred_on desc, created_at desc limit 100) e), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create function public.record_admin_merchant_movement(
  target_merchant_id text, movement_kind text, movement_amount numeric,
  movement_date date, movement_description text, movement_reference text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare association_id uuid; result_id uuid;
begin
  select u.organization_id into association_id from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if association_id is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.organizations o where o.id = association_id and o.wave_merchant_id = target_merchant_id
    union select 1 from public.wave_merchant_change_requests r where r.organization_id = association_id
      and r.status = 'applied' and target_merchant_id in (r.old_merchant_id, r.new_merchant_id)
  ) then raise exception 'Unknown merchant account' using errcode = '22023'; end if;
  if movement_kind not in ('opening', 'receipt', 'disbursement', 'fee', 'refund',
    'transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out')
    or movement_amount is null or movement_amount <= 0 or movement_amount > 9999999999
    or movement_date is null or movement_date > current_date
    or length(btrim(coalesce(movement_description, ''))) not between 1 and 500 then
    raise exception 'Invalid merchant movement' using errcode = '22023';
  end if;
  if movement_kind <> 'opening' and length(btrim(coalesce(movement_reference, ''))) = 0 then
    raise exception 'Wave transaction reference is required' using errcode = '22023';
  end if;
  insert into public.merchant_ledger_entries
    (organization_id, merchant_id, kind, amount, occurred_on, description, external_reference, recorded_by)
    values (association_id, target_merchant_id, movement_kind, movement_amount, movement_date,
      btrim(movement_description), nullif(btrim(movement_reference), ''), auth.uid()) returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.prevent_merchant_ledger_mutation() from public, anon, authenticated;
revoke all on function public.get_admin_merchant_ledger() from public, anon;
revoke all on function public.record_admin_merchant_movement(text, text, numeric, date, text, text) from public, anon;
grant execute on function public.get_admin_merchant_ledger() to authenticated;
grant execute on function public.record_admin_merchant_movement(text, text, numeric, date, text, text) to authenticated;
notify pgrst, 'reload schema';
