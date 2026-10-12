create or replace function public.get_my_member_dashboard(selected_year integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare member_value uuid; organization_value uuid; first_name_value text;
  organization_name_value text; monthly_rate numeric; monthly_dues jsonb; exceptional_dues jsonb;
begin
  if selected_year is null or selected_year not between 2000 and 2100 then
    raise exception 'Invalid year' using errcode = '22023';
  end if;

  select m.id, m.organization_id, m.first_name, o.name, o.monthly_contribution_amount
  into member_value, organization_value, first_name_value, organization_name_value, monthly_rate
  from public.members m
  join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid() and u.role = 'member' and u.is_active and o.is_active
    and m.status <> 'removed';
  if member_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'month', d.contribution_month, 'dueDate', d.due_date,
    'amountDue', d.amount_due, 'amountPaid', d.amount_paid,
    'amountRemaining', d.remaining_amount, 'status', d.status
  ) order by d.contribution_month), '[]'::jsonb)
  into monthly_dues
  from public.monthly_contribution_dues d
  where d.member_id = member_value;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'label', c.label, 'dueDate', c.due_date,
    'amountDue', d.amount_due, 'amountPaid', d.amount_paid
  ) order by c.due_date), '[]'::jsonb)
  into exceptional_dues
  from public.exceptional_contribution_dues d
  join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
  where d.member_id = member_value and c.organization_id = organization_value;

  return jsonb_build_object(
    'firstName', first_name_value,
    'organizationName', organization_name_value,
    'monthlyRate', monthly_rate,
    'monthlyDues', monthly_dues,
    'exceptionalDues', exceptional_dues
  );
end;
$$;
revoke all on function public.get_my_member_dashboard(integer) from public, anon;
grant execute on function public.get_my_member_dashboard(integer) to authenticated;
notify pgrst, 'reload schema';
