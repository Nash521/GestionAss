-- An unresolved request blocks another request for the same due; ambiguous provider
-- failures must be reconciled rather than retried with a new reference.
create unique index jeko_one_unresolved_per_due on public.jeko_payment_intents(monthly_due_id)
where status in ('creating', 'pending', 'needs_review');

create function public.reserve_jeko_monthly_payment(admin_id uuid, target_member_id uuid, target_due_id uuid, payment_amount bigint, payment_reference text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; d record; count_value integer; allowed boolean; result_id uuid; store_value uuid;
begin
  select u.organization_id into organization_value from public.users u join public.organizations o on o.id = u.organization_id
  where u.id = admin_id and u.role = 'admin' and u.is_active and o.is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  select store_id into store_value from public.jeko_configurations where organization_id = organization_value;
  if store_value is null then raise exception 'Jeko not configured'; end if;
  select due.amount_due, due.amount_paid, due.remaining_amount, o.monthly_payment_max_installments as max_payments
  into d from public.monthly_contribution_dues due join public.members m on m.id = due.member_id
  join public.organizations o on o.id = m.organization_id
  where due.id = target_due_id and m.id = target_member_id and m.organization_id = organization_value for update of due;
  if not found then raise exception 'Contribution due not found'; end if;
  select count(*) into count_value from public.contribution_payments where monthly_contribution_due_id = target_due_id;
  if payment_amount is null or payment_amount <= 0 or payment_amount > 9999999999 or count_value >= d.max_payments then raise exception 'Invalid payment amount'; end if;
  if d.amount_paid > 0 and not exists (select 1 from generate_series(1,d.max_payments) slot where
    (case when slot = d.max_payments then d.amount_due else round(d.amount_due * slot / d.max_payments, 0) end) = d.amount_paid) then
    allowed := payment_amount = d.remaining_amount;
  else
    select exists (select 1 from generate_series(1,d.max_payments) slot
      cross join lateral (select case when slot = d.max_payments then d.amount_due else round(d.amount_due * slot / d.max_payments, 0) end as target) mark
      where mark.target > d.amount_paid and payment_amount = mark.target - d.amount_paid
      and (count_value + 1 < d.max_payments or mark.target = d.amount_due)) into allowed;
  end if;
  if not coalesce(allowed,false) or payment_amount > d.remaining_amount then raise exception 'Invalid payment amount'; end if;
  if payment_reference is null or payment_reference !~ '^[A-Za-z0-9_-]{5,100}$' then raise exception 'Invalid reference'; end if;
  insert into public.jeko_payment_intents (organization_id, member_id, monthly_due_id, created_by, amount_xof, store_id, reference)
  values (organization_value, target_member_id, target_due_id, admin_id, payment_amount, store_value, payment_reference) returning id into result_id;
  return result_id;
end; $$;
revoke all on function public.reserve_jeko_monthly_payment(uuid,uuid,uuid,bigint,text) from public, anon, authenticated;
grant execute on function public.reserve_jeko_monthly_payment(uuid,uuid,uuid,bigint,text) to service_role;
