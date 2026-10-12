-- Pin one Wave merchant per association. The initial merchant must be verified
-- by the association; a matching URL alone cannot prove account ownership.
create function public.wave_merchant_id(payment_url text)
returns text language sql immutable set search_path = '' as $$
  select case when public.is_valid_wave_fixed_link(payment_url)
    then substring(payment_url from '^https://pay[.]wave[.]com/(?:m|mqr)/([^/?]+)')
  end;
$$;

alter table public.organizations add column wave_merchant_id text;

do $$
declare association record; merchant_ids text[];
begin
  for association in select id, wave_monthly_full_url, wave_monthly_half_url from public.organizations loop
    select array_agg(distinct merchant_id) into merchant_ids from (
      select public.wave_merchant_id(association.wave_monthly_full_url) as merchant_id
      union all select public.wave_merchant_id(association.wave_monthly_half_url)
      union all select public.wave_merchant_id(c.wave_payment_url)
        from public.exceptional_contributions c where c.organization_id = association.id
    ) links where merchant_id is not null;
    if coalesce(array_length(merchant_ids, 1), 0) > 1 then
      raise exception 'Association % has Wave links from different merchants; verify them before migration', association.id;
    end if;
    update public.organizations set wave_merchant_id = merchant_ids[1] where id = association.id;
  end loop;
end;
$$;

create function public.enforce_organization_wave_merchant()
returns trigger language plpgsql set search_path = '' as $$
declare full_merchant text; half_merchant text;
begin
  if tg_op = 'UPDATE' and old.wave_merchant_id is not null
    and new.wave_merchant_id is distinct from old.wave_merchant_id then
    raise exception 'Wave merchant is locked for this association' using errcode = '23514';
  end if;
  full_merchant := public.wave_merchant_id(new.wave_monthly_full_url);
  half_merchant := public.wave_merchant_id(new.wave_monthly_half_url);
  if new.wave_monthly_full_url is not null and full_merchant is null
    or new.wave_monthly_half_url is not null and half_merchant is null then
    raise exception 'Invalid Wave merchant link' using errcode = '23514';
  end if;
  if full_merchant is not null and half_merchant is not null and full_merchant <> half_merchant then
    raise exception 'Wave links must use the same merchant' using errcode = '23514';
  end if;
  new.wave_merchant_id := coalesce(new.wave_merchant_id, full_merchant, half_merchant);
  if full_merchant is not null and full_merchant <> new.wave_merchant_id
    or half_merchant is not null and half_merchant <> new.wave_merchant_id then
    raise exception 'Wave link does not belong to the association merchant' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger enforce_organization_wave_merchant
before insert or update of wave_merchant_id, wave_monthly_full_url, wave_monthly_half_url
on public.organizations for each row execute function public.enforce_organization_wave_merchant();

create function public.enforce_exceptional_wave_merchant()
returns trigger language plpgsql set search_path = '' as $$
declare pinned_merchant text; link_merchant text;
begin
  if new.wave_payment_url is null then return new; end if;
  link_merchant := public.wave_merchant_id(new.wave_payment_url);
  if link_merchant is null then
    raise exception 'Invalid Wave merchant link' using errcode = '23514';
  end if;
  select wave_merchant_id into pinned_merchant from public.organizations
    where id = new.organization_id for update;
  if not found then raise exception 'Association not found' using errcode = '23503'; end if;
  if pinned_merchant is null then
    update public.organizations set wave_merchant_id = link_merchant where id = new.organization_id;
  elsif pinned_merchant <> link_merchant then
    raise exception 'Wave link does not belong to the association merchant' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger enforce_exceptional_wave_merchant
before insert or update of organization_id, wave_payment_url
on public.exceptional_contributions for each row execute function public.enforce_exceptional_wave_merchant();

create or replace function public.get_admin_wave_monthly_links()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare organization_value uuid; result jsonb;
begin
  select u.organization_id into organization_value from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select jsonb_build_object('fullUrl', o.wave_monthly_full_url, 'halfUrl', o.wave_monthly_half_url,
    'merchantId', o.wave_merchant_id)
    into result from public.organizations o where o.id = organization_value;
  return result;
end;
$$;

create or replace function public.update_admin_wave_monthly_links(full_url text, half_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; full_value text; half_value text; result jsonb;
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
  select jsonb_build_object('fullUrl', o.wave_monthly_full_url, 'halfUrl', o.wave_monthly_half_url,
    'merchantId', o.wave_merchant_id) into result
    from public.organizations o where id = organization_value;
  return result;
end;
$$;

revoke all on function public.wave_merchant_id(text) from public, anon, authenticated;
revoke all on function public.enforce_organization_wave_merchant() from public, anon, authenticated;
revoke all on function public.enforce_exceptional_wave_merchant() from public, anon, authenticated;
