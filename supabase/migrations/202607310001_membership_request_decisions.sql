alter table public.members drop constraint members_member_number_key;
alter table public.members add constraint members_organization_member_number_key unique (organization_id, member_number);

create function public.decide_membership_request(request_id uuid, decision public.membership_request_status, reason text, admin_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.membership_requests;
  new_member_id uuid;
  next_number text;
begin
  select * into request_row from public.membership_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'Request is not pending'; end if;
  if not public.is_active_admin_for_organization(admin_id, request_row.organization_id) then raise exception 'Unauthorized'; end if;

  if decision = 'rejected' then
    if length(btrim(coalesce(reason, ''))) = 0 then raise exception 'Rejection reason required'; end if;
    update public.membership_requests set status = 'rejected', rejection_reason = btrim(reason), reviewed_by = admin_id, reviewed_at = now() where id = request_id;
    return null;
  end if;
  if decision <> 'approved' then raise exception 'Invalid decision'; end if;

  perform pg_advisory_xact_lock(hashtextextended(request_row.organization_id::text, 0));
  select 'M-' || lpad((coalesce(max(substring(member_number from 3)::integer), 0) + 1)::text, 6, '0') into next_number from public.members where organization_id = request_row.organization_id;
  insert into public.members (organization_id, user_id, member_number, first_name, last_name, phone, status, created_by)
  values (request_row.organization_id, request_row.user_id, next_number, request_row.first_name, request_row.last_name, request_row.phone, 'active', admin_id)
  returning id into new_member_id;
  insert into public.membership_fees (member_id, amount_due, amount_paid, remaining_amount, status)
  select new_member_id, membership_fee_amount, 0, membership_fee_amount, 'unpaid' from public.organizations where id = request_row.organization_id;
  update public.users set is_active = true where id = request_row.user_id;
  update public.membership_requests set status = 'approved', member_id = new_member_id, reviewed_by = admin_id, reviewed_at = now() where id = request_id;
  return new_member_id;
end;
$$;

revoke all on function public.decide_membership_request(uuid, public.membership_request_status, text, uuid) from public;
grant execute on function public.decide_membership_request(uuid, public.membership_request_status, text, uuid) to service_role;
