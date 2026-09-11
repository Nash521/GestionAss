create or replace function public.manage_admin_member(
  admin_id uuid,
  target_member_id uuid,
  action text,
  first_name_value text default null,
  last_name_value text default null,
  phone_value text default null
)
returns public.member_status
language plpgsql security definer set search_path = public
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
    return current_status;
  end if;
  if action = 'suspend' then next_status := 'suspended'; elsif action = 'reactivate' then next_status := 'active'; elsif action = 'archive' then next_status := 'removed'; else raise exception 'Invalid member action'; end if;
  if current_status = 'removed' and next_status <> 'active' then raise exception 'Invalid member transition'; end if;
  if current_status = 'active' and next_status = 'active' then raise exception 'Invalid member transition'; end if;
  if current_status = 'suspended' and next_status = 'suspended' then raise exception 'Invalid member transition'; end if;
  if (next_status in ('suspended', 'removed')) and exists (select 1 from public.users where id = target_user and role = 'admin' and is_active)
     and (select count(*) from public.users where organization_id = organization_value and role = 'admin' and is_active) <= 1 then raise exception 'Last active administrator'; end if;
  update public.members set status = next_status where id = target_member_id;
  update public.users set is_active = next_status = 'active' where id = target_user;
  return next_status;
exception when unique_violation then raise exception 'Phone already used';
end;
$$;

revoke all on function public.manage_admin_member(uuid, uuid, text, text, text, text) from public;
grant execute on function public.manage_admin_member(uuid, uuid, text, text, text, text) to service_role;
