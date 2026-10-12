create table public.contribution_settings_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid not null references public.users(id) on delete restrict,
  previous_values jsonb not null,
  new_values jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.contribution_settings_audit enable row level security;
revoke all on public.contribution_settings_audit from public, anon, authenticated;
grant select on public.contribution_settings_audit to authenticated, service_role;
create policy "association admins read contribution settings changes" on public.contribution_settings_audit
  for select to authenticated using (public.is_active_admin_for_organization(auth.uid(), organization_id));

create or replace function public.get_monthly_contribution_settings(admin_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare organization_value uuid; result jsonb;
begin
  select u.organization_id into organization_value
  from public.users u join public.organizations o on o.id = u.organization_id
  where u.id = admin_id and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select jsonb_build_object(
    'membershipFeeAmount', membership_fee_amount,
    'monthlyAmount', monthly_contribution_amount,
    'dueDay', monthly_contribution_due_day,
    'maxPayments', monthly_payment_max_installments
  ) into result from public.organizations where id = organization_value;
  return result;
end;
$$;

create function public.update_admin_contribution_settings(
  admin_id uuid, membership_fee_amount numeric, monthly_amount numeric, due_day smallint, max_payments smallint
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; previous_value jsonb; next_value jsonb;
begin
  select u.organization_id into organization_value
  from public.users u join public.organizations o on o.id = u.organization_id
  where u.id = admin_id and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if membership_fee_amount is null or membership_fee_amount < 0 or membership_fee_amount > 9999999999
    or trunc(membership_fee_amount) <> membership_fee_amount
    or monthly_amount is null or monthly_amount < 0 or monthly_amount > 9999999999
    or trunc(monthly_amount) <> monthly_amount
    or due_day is null or due_day not between 1 and 28
    or max_payments is null or max_payments not between 1 and 12 then
    raise exception 'Invalid contribution settings' using errcode = '22023';
  end if;
  perform 1 from public.organizations where id = organization_value for update;
  previous_value := public.get_monthly_contribution_settings(admin_id);
  update public.organizations
  set membership_fee_amount = update_admin_contribution_settings.membership_fee_amount,
      monthly_contribution_amount = monthly_amount,
      monthly_contribution_due_day = due_day,
      monthly_payment_max_installments = max_payments
  where id = organization_value;
  next_value := public.get_monthly_contribution_settings(admin_id);
  insert into public.contribution_settings_audit (organization_id, actor_id, previous_values, new_values)
  values (organization_value, admin_id, previous_value, next_value);
  return next_value;
end;
$$;
revoke all on function public.update_admin_contribution_settings(uuid, numeric, numeric, smallint, smallint) from public, anon, authenticated;
grant execute on function public.update_admin_contribution_settings(uuid, numeric, numeric, smallint, smallint) to service_role;
