-- A merchant change needs two distinct active administrators. Existing
-- exceptional links are removed atomically so no member sees the old payee.
create table public.wave_merchant_change_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  requested_by uuid not null references public.users(id) on delete restrict,
  reviewed_by uuid references public.users(id) on delete restrict,
  old_merchant_id text not null,
  new_merchant_id text not null,
  full_url text not null,
  half_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'applied', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (old_merchant_id <> new_merchant_id),
  check (reviewed_by is null or reviewed_by <> requested_by)
);
create unique index one_pending_wave_merchant_change_per_association
  on public.wave_merchant_change_requests(organization_id) where status = 'pending';
alter table public.wave_merchant_change_requests enable row level security;
revoke all on public.wave_merchant_change_requests from public, anon, authenticated;
grant select on public.wave_merchant_change_requests to authenticated, service_role;
create policy "association admins read merchant change requests"
on public.wave_merchant_change_requests for select to authenticated
using (public.is_active_admin_for_organization(auth.uid(), organization_id));

create or replace function public.enforce_organization_wave_merchant()
returns trigger language plpgsql set search_path = '' as $$
declare full_merchant text; half_merchant text; rotation_id uuid;
begin
  if tg_op = 'UPDATE' and old.wave_merchant_id is not null
    and new.wave_merchant_id is distinct from old.wave_merchant_id then
    rotation_id := nullif(current_setting('app.wave_merchant_rotation_id', true), '')::uuid;
    if not exists (
      select 1 from public.wave_merchant_change_requests r
      where r.id = rotation_id and r.organization_id = old.id and r.status = 'approved'
        and r.old_merchant_id = old.wave_merchant_id and r.new_merchant_id = new.wave_merchant_id
        and r.full_url = new.wave_monthly_full_url
        and r.half_url is not distinct from new.wave_monthly_half_url
        and r.reviewed_by = auth.uid()
    ) then
      raise exception 'Wave merchant is locked for this association' using errcode = '23514';
    end if;
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

create function public.get_admin_wave_merchant_change_state()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare association_id uuid; result jsonb;
begin
  select u.organization_id into association_id from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if association_id is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select jsonb_build_object(
    'pending', (select jsonb_build_object('id', r.id, 'oldMerchantId', r.old_merchant_id,
      'newMerchantId', r.new_merchant_id, 'fullUrl', r.full_url, 'halfUrl', r.half_url,
      'requestedByMe', r.requested_by = auth.uid(), 'requestedAt', r.requested_at)
      from public.wave_merchant_change_requests r
      where r.organization_id = association_id and r.status = 'pending'),
    'missingExceptionalLinks', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'label', c.label, 'amount', c.amount, 'dueDate', c.due_date)
      order by c.due_date, c.created_at)
      from public.exceptional_contributions c where c.organization_id = association_id
        and c.wave_payment_url is null and c.due_date >= current_date
        and exists (select 1 from public.exceptional_contribution_dues d
          where d.exceptional_contribution_id = c.id and d.remaining_amount > 0)), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create function public.request_wave_merchant_change(full_url text, half_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare association_id uuid; current_merchant text; next_merchant text;
  full_value text; half_value text; monthly_amount numeric; max_installments integer; request_id uuid;
begin
  select u.organization_id into association_id from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if association_id is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select o.wave_merchant_id, o.monthly_contribution_amount, o.monthly_payment_max_installments
    into current_merchant, monthly_amount, max_installments
    from public.organizations o where o.id = association_id for update;
  if current_merchant is null then raise exception 'Configure the first Wave merchant normally' using errcode = '22023'; end if;
  if (select count(*) from public.users u where u.organization_id = association_id
    and u.role = 'admin' and u.is_active) < 2 then
    raise exception 'A second active administrator is required' using errcode = '22023';
  end if;
  full_value := nullif(btrim(full_url), '');
  half_value := nullif(btrim(half_url), '');
  next_merchant := public.wave_merchant_id(full_value);
  if next_merchant is null or next_merchant = current_merchant
    or public.wave_link_amount(full_value) is distinct from monthly_amount
    or (max_installments = 2 and (monthly_amount <= 0 or mod(monthly_amount, 2) <> 0
      or public.wave_merchant_id(half_value) is distinct from next_merchant
      or public.wave_link_amount(half_value) is distinct from monthly_amount / 2))
    or (half_value is not null and (public.wave_merchant_id(half_value) is distinct from next_merchant
      or public.wave_link_amount(half_value) is distinct from monthly_amount / 2)) then
    raise exception 'Invalid replacement Wave links or amounts' using errcode = '22023';
  end if;
  insert into public.wave_merchant_change_requests
    (organization_id, requested_by, old_merchant_id, new_merchant_id, full_url, half_url)
    values (association_id, auth.uid(), current_merchant, next_merchant, full_value, half_value)
    returning id into request_id;
  return jsonb_build_object('id', request_id);
end;
$$;

create function public.decide_wave_merchant_change(request_id uuid, approve boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare association_id uuid; request_row public.wave_merchant_change_requests%rowtype;
begin
  select u.organization_id into association_id from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if association_id is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  -- Lock the organization first, matching the lock order used when requesting.
  perform 1 from public.organizations where id = association_id for update;
  select * into request_row from public.wave_merchant_change_requests
    where id = request_id and organization_id = association_id and status = 'pending' for update;
  if not found then raise exception 'Pending request not found' using errcode = '22023'; end if;
  if request_row.requested_by = auth.uid() then
    raise exception 'Another administrator must review this change' using errcode = '42501';
  end if;
  if not approve then
    update public.wave_merchant_change_requests set status = 'rejected', reviewed_by = auth.uid(),
      reviewed_at = now() where id = request_id;
    return jsonb_build_object('status', 'rejected');
  end if;
  if (select wave_merchant_id from public.organizations where id = association_id)
    is distinct from request_row.old_merchant_id then
    raise exception 'Merchant changed since request' using errcode = '22023';
  end if;
  if public.wave_link_amount(request_row.full_url) is distinct from
      (select monthly_contribution_amount from public.organizations where id = association_id)
    or ((select monthly_payment_max_installments from public.organizations where id = association_id) = 2
      and (request_row.half_url is null or public.wave_link_amount(request_row.half_url) is distinct from
        (select monthly_contribution_amount / 2 from public.organizations where id = association_id))) then
    raise exception 'Monthly settings changed since request' using errcode = '22023';
  end if;
  update public.wave_merchant_change_requests set status = 'approved', reviewed_by = auth.uid(),
    reviewed_at = now() where id = request_id;
  perform set_config('app.wave_merchant_rotation_id', request_id::text, true);
  update public.organizations set wave_merchant_id = request_row.new_merchant_id,
    wave_monthly_full_url = request_row.full_url, wave_monthly_half_url = request_row.half_url
    where id = association_id;
  -- Historical and outstanding exceptional links must never point to the old payee.
  update public.exceptional_contributions set wave_payment_url = null
    where organization_id = association_id and wave_payment_url is not null;
  update public.wave_merchant_change_requests set status = 'applied' where id = request_id;
  perform set_config('app.wave_merchant_rotation_id', '', true);
  return jsonb_build_object('status', 'applied', 'merchantId', request_row.new_merchant_id);
end;
$$;

create function public.update_admin_exceptional_wave_link(contribution_id uuid, payment_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare association_id uuid; contribution_amount numeric; link_value text;
begin
  select u.organization_id into association_id from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.id = auth.uid() and u.role = 'admin' and u.is_active and o.is_active;
  if association_id is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select c.amount into contribution_amount from public.exceptional_contributions c
    where c.id = contribution_id and c.organization_id = association_id
      and c.due_date >= current_date and c.wave_payment_url is null
      and exists (select 1 from public.exceptional_contribution_dues d
        where d.exceptional_contribution_id = c.id and d.remaining_amount > 0);
  if not found then raise exception 'Contribution unavailable for link replacement' using errcode = '22023'; end if;
  link_value := nullif(btrim(payment_url), '');
  if public.wave_link_amount(link_value) is distinct from contribution_amount then
    raise exception 'Wave link amount does not match contribution' using errcode = '22023';
  end if;
  update public.exceptional_contributions set wave_payment_url = link_value
    where id = contribution_id and organization_id = association_id and wave_payment_url is null;
  if not found then raise exception 'Contribution link already updated' using errcode = '22023'; end if;
  return jsonb_build_object('id', contribution_id);
end;
$$;

revoke all on function public.get_admin_wave_merchant_change_state() from public, anon;
revoke all on function public.request_wave_merchant_change(text, text) from public, anon;
revoke all on function public.decide_wave_merchant_change(uuid, boolean) from public, anon;
revoke all on function public.update_admin_exceptional_wave_link(uuid, text) from public, anon;
grant execute on function public.get_admin_wave_merchant_change_state() to authenticated;
grant execute on function public.request_wave_merchant_change(text, text) to authenticated;
grant execute on function public.decide_wave_merchant_change(uuid, boolean) to authenticated;
grant execute on function public.update_admin_exceptional_wave_link(uuid, text) to authenticated;
notify pgrst, 'reload schema';
