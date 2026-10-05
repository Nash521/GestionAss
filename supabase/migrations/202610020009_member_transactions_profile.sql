create function public.get_my_member_profile()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'firstName', m.first_name, 'lastName', m.last_name,
    'memberNumber', m.member_number, 'phone', m.phone,
    'joiningDate', m.joining_date, 'memberStatus', m.status,
    'organizationName', o.name,
    'membershipStatus', coalesce(f.status::text, 'unpaid'),
    'membershipAmountDue', coalesce(f.amount_due, o.membership_fee_amount),
    'membershipAmountPaid', coalesce(f.amount_paid, 0)
  ) into result
  from public.members m
  join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
  join public.organizations o on o.id = m.organization_id
  left join public.membership_fees f on f.member_id = m.id
  where m.user_id = auth.uid() and u.role = 'member' and u.is_active and o.is_active
    and m.status <> 'removed';
  if result is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  return result;
end;
$$;
revoke all on function public.get_my_member_profile() from public, anon;
grant execute on function public.get_my_member_profile() to authenticated;

create function public.get_my_member_transactions(page_limit integer default 30, page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare member_value uuid; organization_value uuid; items jsonb; total_value integer;
begin
  if page_limit is null or page_limit not between 1 and 50 or page_offset is null or page_offset < 0 then
    raise exception 'Invalid pagination' using errcode = '22023';
  end if;
  select m.id, m.organization_id into member_value, organization_value
  from public.members m
  join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid() and u.role = 'member' and u.is_active and o.is_active
    and m.status <> 'removed';
  if member_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;

  select count(*) into total_value
  from public.contribution_payments p
  left join public.membership_fees f on f.id = p.membership_fee_id
  left join public.monthly_contribution_dues md on md.id = p.monthly_contribution_due_id
  left join public.exceptional_contribution_dues ed on ed.id = p.exceptional_contribution_due_id
  where p.organization_id = organization_value
    and coalesce(f.member_id, md.member_id, ed.member_id) = member_value;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', activity.id, 'kind', activity.kind, 'label', activity.label,
    'month', activity.month, 'amount', activity.amount,
    'paidOn', activity.paid_on, 'paymentSource', activity.payment_source,
    'reference', activity.payment_reference
  ) order by activity.paid_on desc, activity.created_at desc, activity.id desc), '[]'::jsonb)
  into items
  from (
    select p.id, p.paid_on, p.created_at, p.amount,
      p.payment_source, p.payment_reference,
      case when p.membership_fee_id is not null then 'membership'
           when p.monthly_contribution_due_id is not null then 'monthly'
           else 'exceptional' end as kind,
      case when p.membership_fee_id is not null then 'Droit d’adhésion'
           when p.monthly_contribution_due_id is not null then 'Mensualité'
           else c.label end as label,
      md.contribution_month as month
    from public.contribution_payments p
    left join public.membership_fees f on f.id = p.membership_fee_id
    left join public.monthly_contribution_dues md on md.id = p.monthly_contribution_due_id
    left join public.exceptional_contribution_dues ed on ed.id = p.exceptional_contribution_due_id
    left join public.exceptional_contributions c on c.id = ed.exceptional_contribution_id
    where p.organization_id = organization_value
      and coalesce(f.member_id, md.member_id, ed.member_id) = member_value
    order by p.paid_on desc, p.created_at desc, p.id desc
    limit page_limit offset page_offset
  ) activity;
  return jsonb_build_object('items', items, 'total', total_value);
end;
$$;
revoke all on function public.get_my_member_transactions(integer, integer) from public, anon;
grant execute on function public.get_my_member_transactions(integer, integer) to authenticated;

notify pgrst, 'reload schema';
