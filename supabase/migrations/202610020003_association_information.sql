alter table public.organizations
  add column contact_phone text not null default '',
  add column contact_email text not null default '',
  add column address text not null default '',
  add column logo_path text;

create table public.association_information_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid not null references public.users(id) on delete restrict,
  previous_values jsonb not null,
  new_values jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.association_information_audit enable row level security;
revoke all on public.association_information_audit from public, anon, authenticated;
grant select on public.association_information_audit to authenticated, service_role;
create policy "association admins read information changes" on public.association_information_audit
  for select to authenticated using (public.is_active_admin_for_organization(auth.uid(), organization_id));

create function public.get_admin_association_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare organization_value uuid; result jsonb;
begin
  select u.organization_id into organization_value
  from public.users u join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select jsonb_build_object('organizationId', o.id, 'name', o.name, 'address', o.address,
    'phone', o.contact_phone, 'email', o.contact_email, 'logoPath', o.logo_path)
  into result from public.organizations o where o.id = organization_value;
  return result;
end;
$$;

create function public.update_admin_association_settings(settings jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; previous_value jsonb; next_value jsonb;
  name_value text; address_value text; phone_value text; email_value text; path_value text;
begin
  select u.organization_id into organization_value
  from public.users u join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if settings is null or jsonb_typeof(settings) <> 'object'
    or not (settings ?& array['name', 'address', 'phone', 'email', 'logoPath'])
    or (select count(*) from jsonb_object_keys(settings)) <> 5
    or jsonb_typeof(settings->'name') <> 'string'
    or jsonb_typeof(settings->'address') <> 'string'
    or jsonb_typeof(settings->'phone') <> 'string'
    or jsonb_typeof(settings->'email') <> 'string'
    or jsonb_typeof(settings->'logoPath') not in ('string', 'null') then
    raise exception 'Invalid association information' using errcode = '22023';
  end if;
  name_value := btrim(settings->>'name');
  address_value := btrim(settings->>'address');
  phone_value := regexp_replace(btrim(settings->>'phone'), '[[:space:]().-]', '', 'g');
  if phone_value ~ '^0[157][0-9]{8}$' then phone_value := '+225' || phone_value; end if;
  email_value := btrim(settings->>'email');
  path_value := settings->>'logoPath';
  if length(name_value) not between 1 and 160 or length(address_value) > 500
    or length(settings->>'phone') > 40 or (phone_value <> '' and phone_value !~ '^\+[1-9][0-9]{7,14}$')
    or length(email_value) > 254 or (email_value <> '' and email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Invalid association information' using errcode = '22023';
  end if;
  if path_value is not null and (path_value !~ '^[a-f0-9-]{36}/[a-z0-9-]+\.(png|jpg)$'
    or split_part(path_value, '/', 1) <> organization_value::text
    or not exists (select 1 from storage.objects where bucket_id = 'association-logos' and name = path_value)) then
    raise exception 'Invalid association logo' using errcode = '22023';
  end if;
  perform 1 from public.organizations where id = organization_value for update;
  previous_value := public.get_admin_association_settings();
  update public.organizations set name = name_value, address = address_value,
    contact_phone = phone_value, contact_email = email_value, logo_path = path_value
  where id = organization_value;
  next_value := public.get_admin_association_settings();
  insert into public.association_information_audit (organization_id, actor_id, previous_values, new_values)
  values (organization_value, auth.uid(), previous_value, next_value);
  return next_value;
end;
$$;

revoke all on function public.get_admin_association_settings() from public, anon;
revoke all on function public.update_admin_association_settings(jsonb) from public, anon;
grant execute on function public.get_admin_association_settings() to authenticated;
grant execute on function public.update_admin_association_settings(jsonb) to authenticated;

create function public.association_logo_access(organization_path text, admin_only boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users u join public.organizations o on o.id = u.organization_id
    where u.id = auth.uid() and u.is_active and o.is_active
      and u.organization_id::text = organization_path
      and (not admin_only or u.role = 'admin')
  );
$$;
revoke all on function public.association_logo_access(text, boolean) from public, anon;
grant execute on function public.association_logo_access(text, boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('association-logos', 'association-logos', false, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;
create policy "association members read their logo" on storage.objects for select to authenticated
  using (bucket_id = 'association-logos' and public.association_logo_access(split_part(name, '/', 1), false));
create policy "association admins upload logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'association-logos' and name ~ '^[a-f0-9-]{36}/[a-z0-9-]+\.(png|jpg)$'
    and public.association_logo_access(split_part(name, '/', 1), true));
