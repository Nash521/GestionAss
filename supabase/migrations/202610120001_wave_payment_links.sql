-- This variant uses links created in Wave Business for fixed amounts. Opening a
-- link is never evidence of payment; confirmation remains an admin action.
alter table public.organizations
  add column wave_monthly_full_url text,
  add column wave_monthly_half_url text;

alter table public.exceptional_contributions
  add column wave_payment_url text;

create function public.is_valid_wave_fixed_link(payment_url text)
returns boolean language sql immutable set search_path = '' as $$
  select payment_url is not null and length(payment_url) <= 500
    and payment_url ~ '^https://pay[.]wave[.]com/(m|mqr)/[A-Za-z0-9_-]+/?$';
$$;

alter table public.organizations add constraint wave_monthly_full_url_valid
  check (wave_monthly_full_url is null or public.is_valid_wave_fixed_link(wave_monthly_full_url));
alter table public.organizations add constraint wave_monthly_half_url_valid
  check (wave_monthly_half_url is null or public.is_valid_wave_fixed_link(wave_monthly_half_url));
alter table public.exceptional_contributions add constraint wave_exceptional_url_valid
  check (wave_payment_url is null or public.is_valid_wave_fixed_link(wave_payment_url));

create function public.get_admin_wave_monthly_links()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare organization_value uuid; result jsonb;
begin
  select u.organization_id into organization_value from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select jsonb_build_object('fullUrl', o.wave_monthly_full_url, 'halfUrl', o.wave_monthly_half_url)
    into result from public.organizations o where o.id = organization_value;
  return result;
end;
$$;

create function public.update_admin_wave_monthly_links(full_url text, half_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; full_value text; half_value text;
begin
  select u.organization_id into organization_value from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  full_value := nullif(btrim(full_url), '');
  half_value := nullif(btrim(half_url), '');
  if (full_value is not null and not public.is_valid_wave_fixed_link(full_value))
    or (half_value is not null and not public.is_valid_wave_fixed_link(half_value)) then
    raise exception 'Invalid Wave payment link' using errcode = '22023';
  end if;
  update public.organizations set wave_monthly_full_url = full_value, wave_monthly_half_url = half_value
    where id = organization_value;
  return jsonb_build_object('fullUrl', full_value, 'halfUrl', half_value);
end;
$$;

create function public.get_my_wave_monthly_links()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object('fullUrl', o.wave_monthly_full_url, 'halfUrl', o.wave_monthly_half_url)
    into result from public.members m
    join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
    join public.organizations o on o.id = m.organization_id
    where m.user_id = auth.uid() and u.role = 'member' and u.is_active and o.is_active and m.status <> 'removed';
  if result is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  return result;
end;
$$;

create function public.get_my_exceptional_wave_link(target_due_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare result text; visible_due boolean;
begin
  select c.wave_payment_url, true into result, visible_due
    from public.exceptional_contribution_dues d
    join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
    join public.members m on m.id = d.member_id and m.organization_id = c.organization_id
    join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
    join public.organizations o on o.id = m.organization_id
    where d.id = target_due_id and m.user_id = auth.uid() and u.role = 'member'
      and u.is_active and o.is_active and m.status <> 'removed';
  if visible_due is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  return result;
end;
$$;

create function public.create_exceptional_contribution_with_wave_link(
  admin_id uuid, contribution_label text, contribution_amount numeric,
  contribution_due_date date, selected_member_ids uuid[], payment_url text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if not public.is_valid_wave_fixed_link(payment_url) then
    raise exception 'Invalid Wave payment link' using errcode = '22023';
  end if;
  result_id := public.create_exceptional_contribution(admin_id, contribution_label,
    contribution_amount, contribution_due_date, selected_member_ids);
  update public.exceptional_contributions set wave_payment_url = btrim(payment_url)
    where id = result_id;
  return result_id;
end;
$$;

revoke all on function public.is_valid_wave_fixed_link(text) from public, anon, authenticated;
revoke all on function public.get_admin_wave_monthly_links() from public, anon;
revoke all on function public.update_admin_wave_monthly_links(text, text) from public, anon;
revoke all on function public.get_my_wave_monthly_links() from public, anon;
revoke all on function public.get_my_exceptional_wave_link(uuid) from public, anon;
revoke all on function public.create_exceptional_contribution_with_wave_link(uuid, text, numeric, date, uuid[], text) from public, anon, authenticated;
grant execute on function public.get_admin_wave_monthly_links() to authenticated;
grant execute on function public.update_admin_wave_monthly_links(text, text) to authenticated;
grant execute on function public.get_my_wave_monthly_links() to authenticated;
grant execute on function public.get_my_exceptional_wave_link(uuid) to authenticated;
grant execute on function public.create_exceptional_contribution_with_wave_link(uuid, text, numeric, date, uuid[], text) to service_role;
notify pgrst, 'reload schema';
