create function public.get_my_member_transaction(target_payment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'id', p.id,
    'kind', case when p.membership_fee_id is not null then 'membership'
                 when p.monthly_contribution_due_id is not null then 'monthly'
                 else 'exceptional' end,
    'label', case when p.membership_fee_id is not null then 'Droit d’adhésion'
                  when p.monthly_contribution_due_id is not null then 'Mensualité'
                  else c.label end,
    'month', md.contribution_month,
    'amount', p.amount,
    'paidOn', p.paid_on,
    'paymentSource', p.payment_source,
    'reference', p.payment_reference,
    'memberName', concat_ws(' ', m.first_name, m.last_name),
    'memberNumber', m.member_number,
    'organizationName', o.name
  ) into result
  from public.contribution_payments p
  left join public.membership_fees f on f.id = p.membership_fee_id
  left join public.monthly_contribution_dues md on md.id = p.monthly_contribution_due_id
  left join public.exceptional_contribution_dues ed on ed.id = p.exceptional_contribution_due_id
  left join public.exceptional_contributions c on c.id = ed.exceptional_contribution_id
  join public.members m on m.id = coalesce(f.member_id, md.member_id, ed.member_id)
    and m.organization_id = p.organization_id
  join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
  join public.organizations o on o.id = m.organization_id
  where p.id = target_payment_id and m.user_id = auth.uid()
    and u.role = 'member' and u.is_active and o.is_active and m.status <> 'removed';
  return result;
end;
$$;
revoke all on function public.get_my_member_transaction(uuid) from public, anon;
grant execute on function public.get_my_member_transaction(uuid) to authenticated;
notify pgrst, 'reload schema';
