create or replace function public.generate_monthly_contribution_dues(admin_id uuid, month_value date)
returns integer language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; normalized_month date; due_day smallint; amount_value numeric; inserted_count integer;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if month_value is null then raise exception 'Contribution month is required'; end if;
  normalized_month := date_trunc('month', month_value)::date;
  select monthly_contribution_due_day, monthly_contribution_amount into due_day, amount_value from public.organizations where id = organization_value for update;
  perform pg_advisory_xact_lock(hashtextextended(organization_value::text || normalized_month::text, 0));
  insert into public.monthly_contribution_dues (member_id, contribution_month, due_date, amount_due, amount_paid, remaining_amount, status)
  select m.id, normalized_month, normalized_month + (due_day - 1), amount_value, 0, amount_value,
    case when amount_value = 0 then 'paid'::public.membership_fee_status else 'unpaid'::public.membership_fee_status end
  from public.members m
  where m.organization_id = organization_value
    and (m.status = 'active' or (m.status = 'suspended' and exists (select 1 from public.member_disciplinary_cases c where c.member_id = m.id and c.status = 'open' and c.contribution_policy = 'continue')))
  on conflict (member_id, contribution_month) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.generate_monthly_contribution_dues(uuid, date) from public;
grant execute on function public.generate_monthly_contribution_dues(uuid, date) to service_role;
