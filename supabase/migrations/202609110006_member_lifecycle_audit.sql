create table public.member_lifecycle_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  action text not null check (action in ('update', 'reactivate')),
  previous_status public.member_status not null,
  next_status public.member_status not null,
  actor_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index member_lifecycle_audit_member_idx on public.member_lifecycle_audit(member_id, created_at desc);
alter table public.member_lifecycle_audit enable row level security;

create or replace function public.manage_admin_member(
  admin_id uuid, target_member_id uuid, action text,
  first_name_value text default null, last_name_value text default null, phone_value text default null
)
returns public.member_status language plpgsql security definer set search_path = public
as $$
declare organization_value uuid; current_status public.member_status; target_user uuid; next_status public.member_status;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  select status, user_id into current_status, target_user from public.members where id = target_member_id and organization_id = organization_value for update;
  if current_status is null then raise exception 'Member not found'; end if;
  if action = 'update' then
    if length(btrim(coalesce(first_name_value, ''))) not between 1 and 100 or length(btrim(coalesce(last_name_value, ''))) not between 1 and 100 or phone_value !~ '^\+2250[157][0-9]{8}$' then raise exception 'Invalid member details'; end if;
    update public.members set first_name = btrim(first_name_value), last_name = btrim(last_name_value), phone = phone_value where id = target_member_id;
    insert into public.member_lifecycle_audit(organization_id, member_id, action, previous_status, next_status, actor_id) values (organization_value, target_member_id, action, current_status, current_status, admin_id);
    return current_status;
  end if;
  if action in ('suspend', 'archive') then raise exception 'Disciplinary investigation required'; end if;
  if action <> 'reactivate' or current_status <> 'suspended' then raise exception 'Invalid member transition'; end if;
  next_status := 'active';
  update public.members set status = next_status where id = target_member_id;
  update public.users set is_active = true where id = target_user;
  insert into public.member_lifecycle_audit(organization_id, member_id, action, previous_status, next_status, actor_id) values (organization_value, target_member_id, action, current_status, next_status, admin_id);
  return next_status;
exception when unique_violation then raise exception 'Phone already used';
end;
$$;
revoke all on table public.member_lifecycle_audit from public;
revoke all on function public.manage_admin_member(uuid, uuid, text, text, text, text) from public;
grant execute on function public.manage_admin_member(uuid, uuid, text, text, text, text) to service_role;
