create or replace function public.list_admin_members(
  admin_id uuid,
  query text,
  payment_status text,
  role_filter text,
  member_status_filter text,
  offset_value integer,
  limit_value integer
)
returns table (
  member_id uuid,
  user_id uuid,
  member_number text,
  first_name text,
  last_name text,
  phone text,
  role public.account_role,
  member_status public.member_status,
  fee_status public.membership_fee_status,
  remaining_amount numeric,
  total_members bigint,
  members_paid bigint,
  members_late bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_organization_id uuid;
  normalized_query text := lower(btrim(coalesce(query, '')));
  escaped_query text;
  normalized_payment_status text := lower(btrim(coalesce(payment_status, 'all')));
  normalized_role_filter text := lower(btrim(coalesce(role_filter, 'all')));
  normalized_member_status_filter text := lower(btrim(coalesce(member_status_filter, 'all')));
begin
  select u.organization_id
  into admin_organization_id
  from public.users u
  where u.id = admin_id
    and u.role = 'admin'
    and u.is_active;

  if admin_organization_id is null then
    raise exception 'Unauthorized';
  end if;

  if normalized_payment_status not in ('all', 'paid', 'unpaid', 'partial') then
    raise exception 'Invalid payment status';
  end if;

  if normalized_role_filter not in ('all', 'member', 'admin') then
    raise exception 'Invalid role filter';
  end if;

  if normalized_member_status_filter not in ('all', 'pending_membership', 'active', 'suspended', 'removed') then
    raise exception 'Invalid member status';
  end if;

  if offset_value is null or offset_value < 0 then
    raise exception 'Offset must be non-negative';
  end if;

  if limit_value is null or limit_value not between 1 and 50 then
    raise exception 'Limit must be between 1 and 50';
  end if;

  escaped_query := replace(replace(replace(normalized_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');

  return query
  with scoped as (
    select
      m.id as member_id,
      m.user_id,
      m.member_number,
      m.first_name,
      m.last_name,
      m.phone,
      u.role,
      m.status as member_status,
      coalesce(f.status, 'paid'::public.membership_fee_status) as fee_status,
      f.remaining_amount
    from public.members m
    join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
    left join public.membership_fees f on f.member_id = m.id
    where m.organization_id = admin_organization_id
  ),
  filtered as (
    select *
    from scoped m
    where (
        normalized_query = ''
        or lower(m.first_name) like '%' || escaped_query || '%' escape E'\\'
        or lower(m.last_name) like '%' || escaped_query || '%' escape E'\\'
        or lower(m.phone) like '%' || escaped_query || '%' escape E'\\'
      )
      and (normalized_payment_status = 'all' or m.fee_status::text = normalized_payment_status)
      and (normalized_role_filter = 'all' or m.role::text = normalized_role_filter)
      and (normalized_member_status_filter = 'all' or m.member_status::text = normalized_member_status_filter)
  ),
  summary as (
    select
      count(*) as total_members,
      count(*) filter (where s.fee_status = 'paid') as members_paid,
      count(*) filter (where s.fee_status in ('unpaid', 'partial')) as members_late
    from scoped s
  ),
  paged as (
    select *
    from filtered f
    order by f.member_number
    offset offset_value
    limit limit_value
  )
  select
    paged.member_id,
    paged.user_id,
    paged.member_number,
    paged.first_name,
    paged.last_name,
    paged.phone,
    paged.role,
    paged.member_status,
    paged.fee_status,
    paged.remaining_amount,
    summary.total_members,
    summary.members_paid,
    summary.members_late
  from summary
  left join paged on true;
end;
$$;
