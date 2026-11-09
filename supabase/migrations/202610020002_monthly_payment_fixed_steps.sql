create function public.record_monthly_step_payment(
  admin_id uuid,
  target_member_id uuid,
  target_due_id uuid,
  payment_amount numeric,
  payment_date date,
  payment_reference_value text,
  payment_source_value text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  organization_value uuid;
  due_record record;
  payment_count integer;
  paid_on_marker boolean;
  allowed_amount boolean;
begin
  select organization_id into organization_value
  from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;

  select d.amount_due, d.amount_paid, d.remaining_amount, o.monthly_payment_max_installments as max_payments
  into due_record
  from public.monthly_contribution_dues d
  join public.members m on m.id = d.member_id
  join public.organizations o on o.id = m.organization_id
  where d.id = target_due_id and d.member_id = target_member_id and m.organization_id = organization_value
  for update of d;
  if not found then raise exception 'Contribution due not found'; end if;

  select count(*) into payment_count from public.contribution_payments p
  where p.monthly_contribution_due_id = target_due_id;
  if payment_count >= due_record.max_payments then raise exception 'Payment installment limit reached'; end if;

  select exists (
    select 1 from generate_series(1, due_record.max_payments) as slot(index_value)
    where (case when slot.index_value = due_record.max_payments then due_record.amount_due
                else round(due_record.amount_due * slot.index_value / due_record.max_payments, 0) end) = due_record.amount_paid
  ) into paid_on_marker;

  if due_record.amount_paid > 0 and not paid_on_marker then
    allowed_amount := payment_amount = due_record.remaining_amount;
  else
    select exists (
      select 1 from generate_series(1, due_record.max_payments) as slot(index_value)
      cross join lateral (select case when slot.index_value = due_record.max_payments then due_record.amount_due
                                     else round(due_record.amount_due * slot.index_value / due_record.max_payments, 0) end as target_paid) marker
      where marker.target_paid > due_record.amount_paid
        and payment_amount = marker.target_paid - due_record.amount_paid
        and (payment_count + 1 < due_record.max_payments or marker.target_paid = due_record.amount_due)
    ) into allowed_amount;
  end if;

  if payment_amount is null or payment_amount <= 0 or due_record.remaining_amount <= 0 or not coalesce(allowed_amount, false) then
    raise exception 'Payment amount is not an allowed installment';
  end if;

  return public.record_contribution_payment(
    admin_id, 'monthly', target_due_id, payment_amount,
    payment_date, payment_reference_value, payment_source_value
  );
end; $$;

revoke all on function public.record_monthly_step_payment(uuid, uuid, uuid, numeric, date, text, text) from public;
grant execute on function public.record_monthly_step_payment(uuid, uuid, uuid, numeric, date, text, text) to service_role;
