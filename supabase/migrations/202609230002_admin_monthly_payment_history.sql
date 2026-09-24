create index if not exists contribution_payments_monthly_history_idx
  on public.contribution_payments (organization_id, monthly_contribution_due_id, paid_on, created_at, id)
  where monthly_contribution_due_id is not null;

create or replace function public.get_admin_finance(admin_id uuid, tab_value text, offset_value integer, limit_value integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  organization_value uuid;
  normalized_tab text := lower(btrim(coalesce(tab_value, '')));
  total_count bigint;
  items jsonb;
  summary jsonb;
begin
  select organization_id into organization_value
  from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if normalized_tab not in ('monthly', 'exceptional', 'disbursements') then raise exception 'Invalid finance tab'; end if;
  if offset_value is null or offset_value < 0 then raise exception 'Offset must be non-negative'; end if;
  if limit_value is null or limit_value not between 1 and 100 then raise exception 'Limit must be between 1 and 100'; end if;

  if normalized_tab = 'monthly' then
    select count(*) into total_count
    from public.contribution_payments p
    join public.monthly_contribution_dues d on d.id = p.monthly_contribution_due_id
    where p.organization_id = organization_value
      and p.monthly_contribution_due_id is not null;

    with payment_history as (
      select
        p.id,
        d.member_id,
        m.first_name,
        m.last_name,
        m.phone,
        d.contribution_month,
        p.amount,
        p.paid_on,
        p.payment_source,
        p.created_at,
        d.amount_due,
        sum(p.amount) over (
          partition by p.monthly_contribution_due_id
          order by p.paid_on, p.created_at, p.id
          rows between unbounded preceding and current row
        ) as amount_paid_after_payment
      from public.contribution_payments p
      join public.monthly_contribution_dues d on d.id = p.monthly_contribution_due_id
      join public.members m on m.id = d.member_id
      where p.organization_id = organization_value
        and p.monthly_contribution_due_id is not null
        and m.organization_id = organization_value
    ), page as (
      select * from payment_history
      order by paid_on desc, created_at desc, id desc
      offset offset_value limit limit_value
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'memberId', member_id,
      'firstName', first_name,
      'lastName', last_name,
      'phone', phone,
      'month', contribution_month,
      'amount', amount,
      'paidOn', paid_on,
      'source', payment_source,
      'statusAfterPayment', case when amount_paid_after_payment >= amount_due then 'paid' else 'partial' end,
      'remainingAfterPayment', case when amount_paid_after_payment >= amount_due then null else amount_due - amount_paid_after_payment end
    ) order by paid_on desc, created_at desc, id desc), '[]'::jsonb)
    into items from page;

    select jsonb_build_object(
      'totalExpected', count(distinct m.id) filter (where m.status = 'active') * max(o.monthly_contribution_amount),
      'totalPaid', coalesce(sum(d.amount_paid), 0),
      'totalRemaining', coalesce(sum(d.remaining_amount), 0)
    ) into summary
    from public.members m
    cross join public.organizations o
    left join public.monthly_contribution_dues d on d.member_id = m.id
    where m.organization_id = organization_value and o.id = organization_value;
  elsif normalized_tab = 'exceptional' then
    select count(*) into total_count from public.exceptional_contributions where organization_id = organization_value;
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', label, 'amount', amount, 'dueDate', due_date, 'createdAt', created_at) order by due_date desc, id desc), '[]'::jsonb)
    into items from (select * from public.exceptional_contributions where organization_id = organization_value order by due_date desc, id desc offset offset_value limit limit_value) p;
    select jsonb_build_object('targetCount', count(d.id), 'totalCollected', coalesce(sum(d.amount_paid), 0), 'totalRemaining', coalesce(sum(d.remaining_amount), 0), 'archivedCount', count(distinct c.id) filter (where c.due_date < current_date))
    into summary from public.exceptional_contributions c left join public.exceptional_contribution_dues d on d.exceptional_contribution_id = c.id where c.organization_id = organization_value;
  else
    select count(*) into total_count from public.disbursements where organization_id = organization_value;
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'memberId', member_id, 'label', label, 'amount', amount, 'disbursedOn', disbursed_on, 'type', disbursement_type, 'exceptionalContributionId', exceptional_contribution_id, 'justification', justification) order by disbursed_on desc, id desc), '[]'::jsonb)
    into items from (select * from public.disbursements where organization_id = organization_value order by disbursed_on desc, id desc offset offset_value limit limit_value) p;
    select jsonb_build_object('totalDisbursed', coalesce(sum(amount), 0)) into summary from public.disbursements where organization_id = organization_value;
  end if;

  return jsonb_build_object('items', items, 'metadata', jsonb_build_object('offset', offset_value, 'limit', limit_value, 'total', total_count), 'summary', summary);
end;
$$;

revoke all on function public.get_admin_finance(uuid, text, integer, integer) from public;
grant execute on function public.get_admin_finance(uuid, text, integer, integer) to service_role;
