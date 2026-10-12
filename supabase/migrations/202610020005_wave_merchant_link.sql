alter table public.organizations add column wave_merchant_payment_url text;

create table public.wave_merchant_link_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid not null references public.users(id) on delete restrict,
  previous_url text,
  new_url text,
  created_at timestamptz not null default now()
);
alter table public.wave_merchant_link_audit enable row level security;
revoke all on public.wave_merchant_link_audit from public, anon, authenticated;
grant select on public.wave_merchant_link_audit to authenticated, service_role;
create policy "association admins read Wave link changes" on public.wave_merchant_link_audit
  for select to authenticated using (public.is_active_admin_for_organization(auth.uid(), organization_id));

create function public.get_admin_wave_payment_link()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare organization_value uuid; result jsonb;
begin
  select u.organization_id into organization_value
  from public.users u join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select jsonb_build_object('url', o.wave_merchant_payment_url) into result
  from public.organizations o where o.id = organization_value;
  return result;
end;
$$;

create function public.update_admin_wave_payment_link(payment_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; previous_url_value text; next_url_value text;
begin
  select u.organization_id into organization_value
  from public.users u join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  next_url_value := nullif(btrim(payment_url), '');
  if next_url_value is not null and (length(next_url_value) > 500
    or next_url_value !~ '^https://pay[.]wave[.]com/(m|mqr)/[A-Za-z0-9_-]+/?$') then
    raise exception 'Invalid Wave merchant payment link' using errcode = '22023';
  end if;
  select o.wave_merchant_payment_url into previous_url_value
  from public.organizations o where o.id = organization_value for update;
  if next_url_value is distinct from previous_url_value then
    update public.organizations set wave_merchant_payment_url = next_url_value where id = organization_value;
    insert into public.wave_merchant_link_audit (organization_id, actor_id, previous_url, new_url)
    values (organization_value, auth.uid(), previous_url_value, next_url_value);
  end if;
  return jsonb_build_object('url', next_url_value);
end;
$$;

revoke all on function public.get_admin_wave_payment_link() from public, anon;
revoke all on function public.update_admin_wave_payment_link(text) from public, anon;
grant execute on function public.get_admin_wave_payment_link() to authenticated;
grant execute on function public.update_admin_wave_payment_link(text) to authenticated;
