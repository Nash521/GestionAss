create or replace function public.record_contribution_payment(admin_id uuid, due_kind text, due_id uuid, payment_amount numeric, payment_date date, payment_reference_value text, payment_source_value text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; current_due record; payment_id uuid; source_value public.contribution_payment_source;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if payment_amount is null or payment_amount <= 0 then raise exception 'Payment amount must be positive'; end if;
  if payment_date is null then raise exception 'Payment date is required'; end if;
  if btrim(coalesce(payment_source_value, '')) not in ('manual', 'wave', 'jeko') then raise exception 'Invalid payment source'; end if;
  source_value := btrim(payment_source_value)::public.contribution_payment_source;
  if due_kind = 'membership' then
    select f.id, f.amount_paid, f.remaining_amount into current_due from public.membership_fees f join public.members m on m.id=f.member_id where f.id=due_id and m.organization_id=organization_value for update;
  elsif due_kind = 'monthly' then
    select d.id, d.amount_paid, d.remaining_amount into current_due from public.monthly_contribution_dues d join public.members m on m.id=d.member_id where d.id=due_id and m.organization_id=organization_value for update;
  elsif due_kind = 'exceptional' then
    select d.id, d.amount_paid, d.remaining_amount into current_due from public.exceptional_contribution_dues d join public.exceptional_contributions c on c.id=d.exceptional_contribution_id where d.id=due_id and c.organization_id=organization_value for update;
  else raise exception 'Invalid contribution due type'; end if;
  if current_due.id is null then raise exception 'Contribution due not found'; end if;
  if payment_amount > current_due.remaining_amount then raise exception 'Payment exceeds remaining amount'; end if;
  if due_kind = 'membership' then update public.membership_fees set amount_paid=amount_paid+payment_amount, remaining_amount=remaining_amount-payment_amount, status=case when remaining_amount-payment_amount=0 then 'paid'::public.membership_fee_status else 'partial'::public.membership_fee_status end where id=due_id;
  elsif due_kind = 'monthly' then update public.monthly_contribution_dues set amount_paid=amount_paid+payment_amount, remaining_amount=remaining_amount-payment_amount, status=case when remaining_amount-payment_amount=0 then 'paid'::public.membership_fee_status else 'partial'::public.membership_fee_status end where id=due_id;
  else update public.exceptional_contribution_dues set amount_paid=amount_paid+payment_amount, remaining_amount=remaining_amount-payment_amount, status=case when remaining_amount-payment_amount=0 then 'paid'::public.membership_fee_status else 'partial'::public.membership_fee_status end where id=due_id; end if;
  insert into public.contribution_payments (organization_id, membership_fee_id, monthly_contribution_due_id, exceptional_contribution_due_id, amount, payment_source, payment_reference, paid_on, recorded_by)
  values (organization_value, case when due_kind='membership' then due_id end, case when due_kind='monthly' then due_id end, case when due_kind='exceptional' then due_id end, payment_amount, source_value, nullif(btrim(coalesce(payment_reference_value, '')), ''), payment_date, admin_id) returning id into payment_id;
  return payment_id;
end;
$$;

-- The webhook handler authenticates the payload before invoking this function.
-- Lock the intent and update the payment and intent in one transaction.
create or replace function public.confirm_jeko_monthly_payment(intent_id uuid, transaction_id text, request_id text, store uuid, payment_reference text, amount bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare item public.jeko_payment_intents%rowtype; payment_id uuid;
begin
  select * into item from public.jeko_payment_intents where id = intent_id for update;
  if not found then raise exception 'Payment intent not found'; end if;
  if item.provider_request_id is distinct from request_id or item.store_id is distinct from store
    or item.reference is distinct from payment_reference or item.amount_xof is distinct from amount
    or transaction_id is null or length(btrim(transaction_id)) = 0 then
    raise exception 'Payment confirmation mismatch';
  end if;
  if item.status = 'confirmed' then
    if item.provider_transaction_id is distinct from transaction_id then raise exception 'Transaction mismatch'; end if;
    return 'confirmed';
  end if;
  if item.status = 'needs_review' then
    if item.provider_transaction_id is distinct from transaction_id then raise exception 'Transaction mismatch'; end if;
    return 'needs_review';
  end if;
  if item.status <> 'pending' then raise exception 'Payment is not pending'; end if;
  begin
    -- Existing finance rules are applied atomically. A conflict requires manual review,
    -- not silently dropping or double-counting money already received.
    payment_id := public.record_monthly_step_payment(item.created_by, item.member_id, item.monthly_due_id,
      item.amount_xof, current_date, transaction_id, 'jeko');
    update public.jeko_payment_intents set status = 'confirmed', provider_transaction_id = transaction_id,
      contribution_payment_id = payment_id, updated_at = now() where id = item.id;
    return 'confirmed';
  exception when others then
    update public.jeko_payment_intents set status = 'needs_review', provider_transaction_id = transaction_id,
      updated_at = now() where id = item.id;
    return 'needs_review';
  end;
end; $$;
revoke all on function public.confirm_jeko_monthly_payment(uuid,text,text,uuid,text,bigint) from public, anon, authenticated;
grant execute on function public.confirm_jeko_monthly_payment(uuid,text,text,uuid,text,bigint) to service_role;
