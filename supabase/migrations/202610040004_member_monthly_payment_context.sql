create function public.get_my_monthly_payment_context(target_month date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'memberId', m.id,
    'memberName', concat_ws(' ', m.first_name, m.last_name),
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
  join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
  join public.organizations o on o.id = m.organization_id
  where d.contribution_month = target_month and m.user_id = auth.uid()
    and u.role = 'member' and u.is_active and o.is_active and m.status <> 'removed';
  return result;
end;
$$;
revoke all on function public.get_my_monthly_payment_context(date) from public, anon;
grant execute on function public.get_my_monthly_payment_context(date) to authenticated;
notify pgrst, 'reload schema';
