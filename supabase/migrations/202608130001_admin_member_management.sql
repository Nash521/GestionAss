create policy "active admin reads organization members"
on public.members
for select
to authenticated
using (public.is_active_admin_for_organization(auth.uid(), organization_id));

create function public.provision_admin_member(
  admin_id uuid,
  new_user_id uuid,
  first_name text,
  last_name text,
  phone text,
  requested_role public.account_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_organization_id uuid;
  existing_organization_id uuid;
  new_member_id uuid;
  next_number text;
  highest_member_number integer;
  normalized_first_name text := btrim(coalesce(first_name, ''));
  normalized_last_name text := btrim(coalesce(last_name, ''));
  normalized_phone text := btrim(coalesce(phone, ''));
begin
  select organization_id
  into admin_organization_id
  from public.users
  where id = admin_id
    and role = 'admin'
    and is_active;

  if admin_organization_id is null then
    raise exception 'Unauthorized';
  end if;

  if requested_role is null or requested_role not in ('member', 'admin') then
    raise exception 'Invalid role';
  end if;

  if length(normalized_first_name) not between 1 and 100
     or length(normalized_last_name) not between 1 and 100 then
    raise exception 'First and last names must contain between 1 and 100 characters';
  end if;

  if normalized_phone !~ '^\+2250[157][0-9]{8}$' then
    raise exception 'Invalid Ivorian phone number';
  end if;

  if not exists (select 1 from auth.users where id = new_user_id) then
    raise exception 'User does not exist';
  end if;

  select organization_id into existing_organization_id from public.users where id = new_user_id;
  if existing_organization_id is not null then
    if existing_organization_id <> admin_organization_id then
      raise exception 'Unauthorized';
    end if;
    raise exception 'User is already provisioned';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(admin_organization_id::text, 0));

  if exists (
    select 1
    from public.members
    where organization_id = admin_organization_id
      and member_number ~ '^M-[0-9]+$'
      and length(substring(member_number from 3)) > 6
  ) then
    raise exception 'Member number limit reached';
  end if;

  select max(substring(member_number from 3)::integer) filter (where member_number ~ '^M-[0-9]{1,6}$')
  into highest_member_number
  from public.members
  where organization_id = admin_organization_id;

  if coalesce(highest_member_number, 0) >= 999999 then
    raise exception 'Member number limit reached';
  end if;

  next_number := 'M-' || lpad((coalesce(highest_member_number, 0) + 1)::text, 6, '0');

  insert into public.users (id, organization_id, role, is_active)
  values (new_user_id, admin_organization_id, requested_role, true);

  insert into public.members (
    organization_id, user_id, member_number, first_name, last_name, phone, status, created_by
  ) values (
    admin_organization_id, new_user_id, next_number, normalized_first_name, normalized_last_name,
    normalized_phone, 'active', admin_id
  )
  returning id into new_member_id;

  insert into public.membership_fees (member_id, amount_due, amount_paid, remaining_amount, status)
  select new_member_id, membership_fee_amount, 0, membership_fee_amount, 'unpaid'
  from public.organizations
  where id = admin_organization_id;

  return new_member_id;
end;
$$;

drop function if exists public.list_admin_members(uuid, text, text, text, integer, integer);

create function public.list_admin_members(
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
  select organization_id
  into admin_organization_id
  from public.users
  where id = admin_id
    and role = 'admin'
    and is_active;

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
      count(*) filter (where fee_status = 'paid') as members_paid,
      count(*) filter (where fee_status in ('unpaid', 'partial')) as members_late
    from scoped
  ),
  paged as (
    select *
    from filtered
    order by member_number
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

revoke all on function public.provision_admin_member(uuid, uuid, text, text, text, public.account_role) from public;
grant execute on function public.provision_admin_member(uuid, uuid, text, text, text, public.account_role) to service_role;
revoke all on function public.list_admin_members(uuid, text, text, text, text, integer, integer) from public;
grant execute on function public.list_admin_members(uuid, text, text, text, text, integer, integer) to service_role;
