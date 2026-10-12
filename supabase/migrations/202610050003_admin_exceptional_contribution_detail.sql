-- Read-only detail, scoped to the authenticated administrator's association.
create or replace function public.get_admin_exceptional_contribution_detail(
  target_contribution_id uuid,
  page_offset integer default 0,
  page_limit integer default 30,
  status_filter text default 'all'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; result jsonb;
begin
  select organization_id into organization_value from public.users
  where id = auth.uid() and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if page_offset is null or page_offset < 0 or page_limit is null or page_limit not between 1 and 50
    or status_filter is null or status_filter not in ('all', 'paid', 'partial', 'unpaid') then
    raise exception 'Invalid pagination or status' using errcode = '22023';
  end if;

  with contribution as (
    select * from public.exceptional_contributions
    where id = target_contribution_id and organization_id = organization_value
  ), dues as (
    select d.*, m.first_name, m.last_name, m.member_number
    from public.exceptional_contribution_dues d
    join contribution c on c.id = d.exceptional_contribution_id
    join public.members m on m.id = d.member_id and m.organization_id = organization_value
  ), filtered as (
    select * from dues where status_filter = 'all' or status::text = status_filter
  ), page as (
    select * from filtered order by last_name, first_name, member_id
    offset page_offset limit page_limit
  )
  select jsonb_build_object(
    'contribution', jsonb_build_object('id', c.id, 'label', c.label, 'amount', c.amount, 'dueDate', c.due_date, 'createdAt', c.created_at),
    'summary', (select jsonb_build_object(
      'memberCount', count(*),
      'paidCount', count(*) filter (where status = 'paid'),
      'partialCount', count(*) filter (where status = 'partial'),
      'unpaidCount', count(*) filter (where status = 'unpaid'),
      'totalExpected', coalesce(sum(amount_due), 0),
      'totalCollected', coalesce(sum(amount_paid), 0),
      'totalRemaining', coalesce(sum(remaining_amount), 0)
    ) from dues),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'memberId', member_id, 'firstName', first_name, 'lastName', last_name,
      'memberNumber', member_number, 'amountDue', amount_due, 'amountPaid', amount_paid,
      'amountRemaining', remaining_amount, 'status', status
    ) order by last_name, first_name, member_id), '[]'::jsonb) from page),
    'metadata', jsonb_build_object('offset', page_offset, 'limit', page_limit, 'total', (select count(*) from filtered))
  ) into result from contribution c;
  return result;
end;
$$;

revoke all on function public.get_admin_exceptional_contribution_detail(uuid, integer, integer, text) from public, anon;
grant execute on function public.get_admin_exceptional_contribution_detail(uuid, integer, integer, text) to authenticated;
