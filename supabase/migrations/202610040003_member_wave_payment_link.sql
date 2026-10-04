create function public.get_my_member_wave_payment_link()
returns text language plpgsql stable security definer set search_path = '' as $$
declare payment_url text;
begin
  select o.wave_merchant_payment_url into payment_url
  from public.members m
  join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid() and u.role = 'member' and u.is_active
    and o.is_active and m.status <> 'removed';
  if not found then raise exception 'Unauthorized' using errcode = '42501'; end if;
  return payment_url;
end;
$$;
revoke all on function public.get_my_member_wave_payment_link() from public, anon;
grant execute on function public.get_my_member_wave_payment_link() to authenticated;
notify pgrst, 'reload schema';
