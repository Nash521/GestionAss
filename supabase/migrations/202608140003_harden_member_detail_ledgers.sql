create or replace function public.enforce_exceptional_contribution_due_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.exceptional_contributions c
    join public.members m on m.id = new.member_id
    where c.id = new.exceptional_contribution_id
      and c.organization_id = m.organization_id
  ) then
    raise exception 'Exceptional contribution member must belong to the organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ledger_creator_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.users
    where id = new.created_by and organization_id = new.organization_id
  ) then
    if tg_table_name = 'exceptional_contributions' then
      raise exception 'Exceptional contribution creator must belong to the organization';
    end if;
    raise exception 'Disbursement creator must belong to the organization';
  end if;
  return new;
end;
$$;

drop trigger if exists exceptional_contribution_dues_enforce_member_organization on public.exceptional_contribution_dues;
create trigger exceptional_contribution_dues_enforce_member_organization
before insert or update of exceptional_contribution_id, member_id on public.exceptional_contribution_dues
for each row execute function public.enforce_exceptional_contribution_due_organization();

drop trigger if exists exceptional_contributions_enforce_creator_organization on public.exceptional_contributions;
create trigger exceptional_contributions_enforce_creator_organization
before insert or update of organization_id, created_by on public.exceptional_contributions
for each row execute function public.enforce_ledger_creator_organization();

drop trigger if exists disbursements_enforce_creator_organization on public.disbursements;
create trigger disbursements_enforce_creator_organization
before insert or update of organization_id, created_by on public.disbursements
for each row execute function public.enforce_ledger_creator_organization();

create or replace function public.get_admin_member_detail(admin_id uuid, target_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_organization_id uuid;
  member_record record;
  membership_fee jsonb;
  monthly_dues jsonb;
  exceptional_dues jsonb;
  aid jsonb;
  summary jsonb;
  chart jsonb;
  exceptional_paid numeric;
  exceptional_remaining numeric;
begin
  select organization_id into admin_organization_id
  from public.users
  where id = admin_id and role = 'admin' and is_active;

  select m.*, u.role into member_record
  from public.members m
  join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
  where m.id = target_member_id and m.organization_id = admin_organization_id;

  if admin_organization_id is null or member_record.id is null then
    raise exception 'Member not found';
  end if;

  select jsonb_build_object('id', id, 'memberId', member_id, 'amountDue', amount_due, 'amountPaid', amount_paid, 'amountRemaining', remaining_amount, 'status', status)
  into membership_fee from public.membership_fees where member_id = target_member_id;
  membership_fee := coalesce(membership_fee, jsonb_build_object(
    'id', null, 'memberId', target_member_id, 'amountDue', 0, 'amountPaid', 0,
    'amountRemaining', 0, 'status', 'paid'
  ));

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'memberId', member_id, 'month', contribution_month, 'dueDate', due_date, 'amountDue', amount_due,
    'amountPaid', amount_paid, 'amountRemaining', remaining_amount, 'status', status
  ) order by contribution_month desc), '[]'::jsonb)
  into monthly_dues from public.monthly_contribution_dues where member_id = target_member_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'exceptionalContributionId', c.id, 'memberId', d.member_id, 'label', c.label, 'dueDate', c.due_date,
    'amountDue', d.amount_due, 'amountPaid', d.amount_paid, 'amountRemaining', d.remaining_amount, 'status', d.status
  ) order by c.due_date desc, c.created_at desc), '[]'::jsonb)
  into exceptional_dues
  from public.exceptional_contribution_dues d
  join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
  where d.member_id = target_member_id
    and c.organization_id = admin_organization_id;

  select jsonb_build_object(
    'count', count(*), 'totalReceived', coalesce(sum(amount), 0),
    'items', coalesce(jsonb_agg(jsonb_build_object('id', id, 'memberId', member_id, 'label', label, 'amount', amount, 'disbursedOn', disbursed_on) order by disbursed_on desc, created_at desc), '[]'::jsonb)
  ) into aid from public.disbursements where member_id = target_member_id;

  select coalesce(sum(d.amount_paid), 0), coalesce(sum(d.remaining_amount), 0)
  into exceptional_paid, exceptional_remaining
  from public.exceptional_contribution_dues d
  join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
  where d.member_id = target_member_id
    and c.organization_id = admin_organization_id;

  select jsonb_build_object(
    'totalContributed', coalesce((select amount_paid from public.membership_fees where member_id = target_member_id), 0) +
      coalesce((select sum(amount_paid) from public.monthly_contribution_dues where member_id = target_member_id), 0) +
      exceptional_paid,
    'monthlyPaid', coalesce((select sum(amount_paid) from public.monthly_contribution_dues where member_id = target_member_id), 0),
    'monthlyRemaining', coalesce((select sum(remaining_amount) from public.monthly_contribution_dues where member_id = target_member_id), 0),
    'exceptionalPaid', exceptional_paid,
    'exceptionalRemaining', exceptional_remaining
  ) into summary;

  select jsonb_agg(jsonb_build_object('month', month_start, 'paid', paid, 'unpaid', unpaid) order by month_start)
  into chart
  from (
    select months.month_start,
      coalesce(sum(d.amount_paid), 0) as paid,
      coalesce(sum(d.remaining_amount), 0) as unpaid
    from generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') as months(month_start)
    left join public.monthly_contribution_dues d on d.member_id = target_member_id and d.contribution_month = months.month_start::date
    group by months.month_start
  ) monthly_chart;

  return jsonb_build_object(
    'member', jsonb_build_object('id', member_record.id, 'memberNumber', member_record.member_number,
      'joiningDate', member_record.joining_date, 'role', member_record.role, 'status', member_record.status,
      'memberStatus', member_record.status, 'paymentStatus', membership_fee->>'status',
      'amountRemaining', (membership_fee->>'amountRemaining')::numeric,
      'firstName', member_record.first_name, 'lastName', member_record.last_name, 'phone', member_record.phone),
    'membershipFee', membership_fee,
    'monthlyDues', monthly_dues,
    'exceptionalDues', exceptional_dues,
    'aid', aid,
    'summary', summary,
    'chart', coalesce(chart, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.enforce_exceptional_contribution_due_organization() from public;
revoke all on function public.enforce_ledger_creator_organization() from public;
revoke all on function public.get_admin_member_detail(uuid, uuid) from public;
grant execute on function public.get_admin_member_detail(uuid, uuid) to service_role;
