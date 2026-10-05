update public.organizations
set monthly_payment_max_installments = 2
where monthly_payment_max_installments > 2;

alter table public.organizations
  alter column monthly_payment_max_installments set default 2,
  drop constraint organizations_monthly_payment_max_installments_check,
  add constraint organizations_monthly_payment_max_installments_check
    check (monthly_payment_max_installments in (1, 2));

create or replace function public.update_monthly_contribution_settings(admin_id uuid, monthly_amount numeric, due_day smallint, max_payments smallint)
returns numeric language plpgsql security definer set search_path = '' as $$
declare organization_value uuid;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if monthly_amount is null or monthly_amount < 0 or due_day is null or due_day not between 1 and 28
    or max_payments is null or max_payments not in (1, 2) then
    raise exception 'Invalid monthly settings';
  end if;
  update public.organizations
  set monthly_contribution_amount = monthly_amount,
      monthly_contribution_due_day = due_day,
      monthly_payment_max_installments = max_payments
  where id = organization_value;
  return monthly_amount;
end; $$;

create or replace function public.update_admin_contribution_settings(
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
    or max_payments is null or max_payments not in (1, 2) then
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
end; $$;

notify pgrst, 'reload schema';
