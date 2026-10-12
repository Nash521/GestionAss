-- Password recovery is available to active admins and members, regardless of
-- whether the account was created by an invitation or by an administrator.
create function public.get_password_reset_account(p_phone text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id
  from auth.users a
  join public.users u on u.id = a.id
  join public.organizations o on o.id = u.organization_id
  left join public.members m on m.user_id = u.id and m.organization_id = u.organization_id
  where p_phone ~ '^\+2250[157][0-9]{8}$'
    and a.phone = ltrim(p_phone, '+')
    and u.is_active and o.is_active
    and (u.role = 'admin' or (u.role = 'member' and m.id is not null and m.status <> 'removed'))
  limit 1;
$$;
revoke all on function public.get_password_reset_account(text) from public, anon, authenticated;
grant execute on function public.get_password_reset_account(text) to service_role;
