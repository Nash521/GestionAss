create or replace function public.get_member_open_dues(admin_id uuid, target_member_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare organization_value uuid; result jsonb;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if not exists (select 1 from public.members where id = target_member_id and organization_id = organization_value) then raise exception 'Member not found'; end if;
  select coalesce(jsonb_agg(row_to_json(items) order by due_date, id), '[]'::jsonb) into result from (
    select f.id, 'membership'::text as kind, 'Droit d’adhésion'::text as label, null::date as due_date, f.amount_due, f.amount_paid, f.remaining_amount, f.status from public.membership_fees f where f.member_id = target_member_id and f.remaining_amount > 0
    union all select d.id, 'monthly', 'Mensualité ' || to_char(d.contribution_month, 'MM/YYYY'), d.due_date, d.amount_due, d.amount_paid, d.remaining_amount, d.status from public.monthly_contribution_dues d where d.member_id = target_member_id and d.remaining_amount > 0
    union all select d.id, 'exceptional', c.label, c.due_date, d.amount_due, d.amount_paid, d.remaining_amount, d.status from public.exceptional_contribution_dues d join public.exceptional_contributions c on c.id = d.exceptional_contribution_id where d.member_id = target_member_id and d.remaining_amount > 0
  ) items;
  return result;
end; $$;
revoke all on function public.get_member_open_dues(uuid, uuid) from public;
grant execute on function public.get_member_open_dues(uuid, uuid) to service_role;
