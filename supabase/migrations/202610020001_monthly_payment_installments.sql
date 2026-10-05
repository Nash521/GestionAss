alter table public.organizations
  add column monthly_payment_max_installments smallint not null default 3
  check (monthly_payment_max_installments between 1 and 12);

drop function public.update_monthly_contribution_settings(uuid, numeric, smallint);

create function public.update_monthly_contribution_settings(admin_id uuid, monthly_amount numeric, due_day smallint, max_payments smallint)
returns numeric language plpgsql security definer set search_path = '' as $$
declare organization_value uuid;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if monthly_amount is null or monthly_amount < 0 or due_day is null or due_day not between 1 and 28 or max_payments is null or max_payments not between 1 and 12 then
    raise exception 'Invalid monthly settings';
  end if;
  update public.organizations
  set monthly_contribution_amount = monthly_amount,
      monthly_contribution_due_day = due_day,
      monthly_payment_max_installments = max_payments
  where id = organization_value;
  return monthly_amount;
end; $$;
revoke all on function public.update_monthly_contribution_settings(uuid, numeric, smallint, smallint) from public;
grant execute on function public.update_monthly_contribution_settings(uuid, numeric, smallint, smallint) to service_role;

create or replace function public.get_monthly_contribution_settings(admin_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; result jsonb;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  select jsonb_build_object(
    'monthlyAmount', monthly_contribution_amount,
    'dueDay', monthly_contribution_due_day,
    'maxPayments', monthly_payment_max_installments
  ) into result from public.organizations where id = organization_value;
  return result;
end; $$;

create function public.get_admin_monthly_payment_context(admin_id uuid, target_member_id uuid, target_due_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; result jsonb;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;

  select jsonb_build_object(
    'memberId', m.id,
    'memberName', m.first_name || ' ' || m.last_name,
    'dueId', d.id,
    'month', d.contribution_month,
    'amountDue', d.amount_due,
    'amountPaid', d.amount_paid,
    'amountRemaining', d.remaining_amount,
    'status', d.status,
    'paymentCount', (select count(*) from public.contribution_payments p where p.monthly_contribution_due_id = d.id),
    'maxPayments', o.monthly_payment_max_installments
  ) into result
  from public.monthly_contribution_dues d
  join public.members m on m.id = d.member_id
  join public.organizations o on o.id = m.organization_id
  where d.id = target_due_id and m.id = target_member_id and m.organization_id = organization_value;

  if result is null then raise exception 'Contribution due not found'; end if;
  return result;
end; $$;
revoke all on function public.get_admin_monthly_payment_context(uuid, uuid, uuid) from public;
grant execute on function public.get_admin_monthly_payment_context(uuid, uuid, uuid) to service_role;

create index contribution_payments_monthly_due_idx on public.contribution_payments (monthly_contribution_due_id)
where monthly_contribution_due_id is not null;

create function public.enforce_monthly_payment_installments()
returns trigger language plpgsql security definer set search_path = '' as $$
declare existing_count integer; max_payments integer; due_remaining numeric;
begin
  if new.monthly_contribution_due_id is null then return new; end if;

  select d.remaining_amount into due_remaining
  from public.monthly_contribution_dues d where d.id = new.monthly_contribution_due_id for update;
  select o.monthly_payment_max_installments into max_payments
  from public.organizations o where o.id = new.organization_id;
  select count(*) into existing_count from public.contribution_payments p
  where p.monthly_contribution_due_id = new.monthly_contribution_due_id;

  if existing_count >= max_payments then raise exception 'Payment installment limit reached'; end if;
  if existing_count + 1 = max_payments and due_remaining > 0 then
    raise exception 'Payment must settle remaining balance on final installment';
  end if;
  return new;
end; $$;
create trigger zz_contribution_payments_monthly_installments
before insert on public.contribution_payments
for each row execute function public.enforce_monthly_payment_installments();
