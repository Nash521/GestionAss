create or replace function public.get_admin_dashboard_summary(admin_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  organization_value uuid;
  organization_name text;
  total_members bigint;
  members_paid bigint;
  members_late bigint;
  membership_collected numeric;
  monthly_collected numeric;
  monthly_outstanding numeric;
  exceptional_collected numeric;
  exceptional_outstanding numeric;
  total_expenses numeric;
  contribution_chart jsonb;
  recent_transactions jsonb;
begin
  select u.organization_id into organization_value
  from public.users u where u.id = admin_id and u.role = 'admin' and u.is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;

  select o.name into organization_name from public.organizations o where o.id = organization_value;
  select s.total_members, s.members_paid, s.members_late
  into total_members, members_paid, members_late
  from public.list_admin_members(admin_id, '', 'all', 'all', 'all', 0, 1) s limit 1;

  select coalesce(sum(f.amount_paid), 0) into membership_collected
  from public.membership_fees f join public.members m on m.id = f.member_id
  where m.organization_id = organization_value;

  select coalesce(sum(d.amount_paid), 0), coalesce(sum(d.remaining_amount), 0)
  into monthly_collected, monthly_outstanding
  from public.monthly_contribution_dues d join public.members m on m.id = d.member_id
  where m.organization_id = organization_value;

  select coalesce(sum(d.amount_paid), 0), coalesce(sum(d.remaining_amount), 0)
  into exceptional_collected, exceptional_outstanding
  from public.exceptional_contribution_dues d
  join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
  where c.organization_id = organization_value;

  select coalesce(sum(d.amount), 0) into total_expenses
  from public.disbursements d where d.organization_id = organization_value;

  select jsonb_agg(jsonb_build_object(
    'month', to_char(months.month_start, 'YYYY-MM'),
    'expected', coalesce((
      select sum(d.amount_due) from public.monthly_contribution_dues d
      join public.members m on m.id = d.member_id
      where m.organization_id = organization_value and d.contribution_month = months.month_start::date
    ), 0),
    'collected', coalesce((
      select sum(p.amount) from public.contribution_payments p
      where p.organization_id = organization_value and p.monthly_contribution_due_id is not null
        and p.paid_on >= months.month_start::date
        and p.paid_on < (months.month_start + interval '1 month')::date
    ), 0)
  ) order by months.month_start) into contribution_chart
  from generate_series(
    date_trunc('month', current_date) - interval '5 months',
    date_trunc('month', current_date), interval '1 month'
  ) as months(month_start);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'kind', t.kind, 'label', t.label,
    'memberName', t.member_name, 'amount', t.amount, 'occurredOn', t.occurred_on
  ) order by t.created_at desc, t.id desc), '[]'::jsonb)
  into recent_transactions
  from (
    select activity.* from (
      select p.id, p.created_at, p.paid_on as occurred_on, p.amount,
        case when p.membership_fee_id is not null then 'membership'
             when p.monthly_contribution_due_id is not null then 'monthly'
             else 'exceptional' end as kind,
        case when p.membership_fee_id is not null then 'Droit d’adhésion'
             when p.monthly_contribution_due_id is not null then 'Mensualité'
             else 'Cotisation exceptionnelle · ' || c.label end as label,
        concat_ws(' ', m.first_name, m.last_name) as member_name
      from public.contribution_payments p
      left join public.membership_fees f on f.id = p.membership_fee_id
      left join public.monthly_contribution_dues md on md.id = p.monthly_contribution_due_id
      left join public.exceptional_contribution_dues ed on ed.id = p.exceptional_contribution_due_id
      left join public.exceptional_contributions c on c.id = ed.exceptional_contribution_id
      left join public.members m on m.id = coalesce(f.member_id, md.member_id, ed.member_id)
      where p.organization_id = organization_value
      union all
      select d.id, d.created_at, d.disbursed_on, d.amount, 'expense', d.label,
        concat_ws(' ', m.first_name, m.last_name)
      from public.disbursements d
      left join public.members m on m.id = d.member_id
      where d.organization_id = organization_value
    ) activity
    order by activity.created_at desc, activity.id desc
    limit 5
  ) t;

  return jsonb_build_object(
    'organizationName', organization_name,
    'totalMembers', total_members,
    'membersPaid', members_paid,
    'membersLate', members_late,
    'totalMonthlyOutstanding', monthly_outstanding,
    'totalExceptionalOutstanding', exceptional_outstanding,
    'contributionChart', contribution_chart,
    'recentTransactions', recent_transactions,
    'totalCash', membership_collected + monthly_collected + exceptional_collected - total_expenses,
    'totalExpenses', total_expenses
  );
end;
$$;

revoke all on function public.get_admin_dashboard_summary(uuid) from public;
grant execute on function public.get_admin_dashboard_summary(uuid) to service_role;

notify pgrst, 'reload schema';
