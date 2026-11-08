-- The webhook handler authenticates the payload before invoking this function.
-- Lock the intent and update the payment and intent in one transaction.
create function public.confirm_jeko_monthly_payment(intent_id uuid, transaction_id text, request_id text, store uuid, payment_reference text, amount bigint)
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
      item.amount_xof, current_date, transaction_id, 'manual');
    update public.contribution_payments set payment_source = 'jeko'::public.contribution_payment_source where id = payment_id;
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
