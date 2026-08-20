alter table public.organizations
  add column monthly_contribution_amount numeric(12, 2) not null default 0 check (monthly_contribution_amount >= 0),
  add column monthly_contribution_due_day smallint not null default 1 check (monthly_contribution_due_day between 1 and 28);

create type public.contribution_payment_source as enum ('manual', 'wave');
create type public.disbursement_type as enum ('general_expense', 'member_aid', 'exceptional_contribution_payment');

create table public.contribution_payments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  membership_fee_id uuid references public.membership_fees(id) on delete restrict,
  monthly_contribution_due_id uuid references public.monthly_contribution_dues(id) on delete restrict,
  exceptional_contribution_due_id uuid references public.exceptional_contribution_dues(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  payment_source public.contribution_payment_source not null,
  payment_reference text,
  paid_on date not null,
  recorded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (num_nonnulls(membership_fee_id, monthly_contribution_due_id, exceptional_contribution_due_id) = 1)
);

alter table public.disbursements
  add column disbursement_type public.disbursement_type,
  add column justification text,
  add column exceptional_contribution_id uuid references public.exceptional_contributions(id) on delete restrict;

update public.disbursements
set disbursement_type = case when member_id is null then 'general_expense'::public.disbursement_type else 'member_aid'::public.disbursement_type end,
    justification = label;

alter table public.disbursements
  alter column disbursement_type set not null,
  alter column justification set not null,
  add constraint disbursements_justification_not_blank check (length(btrim(justification)) > 0),
  add constraint disbursements_context_check check (
    (disbursement_type = 'general_expense' and member_id is null and exceptional_contribution_id is null)
    or (disbursement_type = 'member_aid' and member_id is not null and exceptional_contribution_id is null)
    or (disbursement_type = 'exceptional_contribution_payment' and member_id is null and exceptional_contribution_id is not null)
  );

create index monthly_contribution_dues_month_id_idx on public.monthly_contribution_dues (contribution_month desc, due_date desc, id desc);
create index members_organization_status_id_idx on public.members (organization_id, status, id);
create index exceptional_contributions_organization_date_id_idx on public.exceptional_contributions (organization_id, due_date desc, id desc);
create index disbursements_organization_date_id_created_idx on public.disbursements (organization_id, disbursed_on desc, id desc, created_at desc);

create function public.enforce_contribution_payment_context()
returns trigger language plpgsql set search_path = '' as $$
declare due_organization_id uuid;
begin
  select organization_id into due_organization_id from public.membership_fees f join public.members m on m.id = f.member_id where f.id = new.membership_fee_id;
  if due_organization_id is null then
    select m.organization_id into due_organization_id from public.monthly_contribution_dues d join public.members m on m.id = d.member_id where d.id = new.monthly_contribution_due_id;
  end if;
  if due_organization_id is null then
    select c.organization_id into due_organization_id from public.exceptional_contribution_dues d join public.exceptional_contributions c on c.id = d.exceptional_contribution_id where d.id = new.exceptional_contribution_due_id;
  end if;
  if due_organization_id is null or due_organization_id <> new.organization_id then
    raise exception 'Contribution payment reference must belong to the organization';
  end if;
  if not exists (select 1 from public.users where id = new.recorded_by and organization_id = new.organization_id) then
    raise exception 'Contribution payment recorder must belong to the organization';
  end if;
  return new;
end;
$$;

create function public.prevent_contribution_payment_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Contribution payments are immutable';
end;
$$;

create function public.enforce_disbursement_exceptional_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.exceptional_contribution_id is not null and not exists (
    select 1 from public.exceptional_contributions where id = new.exceptional_contribution_id and organization_id = new.organization_id
  ) then
    raise exception 'Disbursement contribution must belong to the organization';
  end if;
  return new;
end;
$$;

create function public.apply_legacy_disbursement_defaults()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.disbursement_type is null then
    new.disbursement_type := case when new.member_id is null then 'general_expense'::public.disbursement_type else 'member_aid'::public.disbursement_type end;
  end if;
  if new.justification is null then new.justification := new.label; end if;
  return new;
end;
$$;

create trigger aaa_disbursements_apply_legacy_defaults before insert on public.disbursements for each row execute function public.apply_legacy_disbursement_defaults();
create trigger contribution_payments_enforce_context before insert on public.contribution_payments for each row execute function public.enforce_contribution_payment_context();
create trigger contribution_payments_immutable before update or delete on public.contribution_payments for each row execute function public.prevent_contribution_payment_mutation();
create trigger disbursements_enforce_exceptional_organization before insert or update of organization_id, exceptional_contribution_id on public.disbursements for each row execute function public.enforce_disbursement_exceptional_organization();

create function public.generate_monthly_contribution_dues(admin_id uuid, month_value date)
returns integer language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; normalized_month date; due_day smallint; amount_value numeric; inserted_count integer;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if month_value is null then raise exception 'Contribution month is required'; end if;
  normalized_month := date_trunc('month', month_value)::date;
  select monthly_contribution_due_day, monthly_contribution_amount into due_day, amount_value from public.organizations where id = organization_value for update;
  perform pg_advisory_xact_lock(hashtextextended(organization_value::text || normalized_month::text, 0));
  insert into public.monthly_contribution_dues (member_id, contribution_month, due_date, amount_due, amount_paid, remaining_amount, status)
  select m.id, normalized_month, normalized_month + (due_day - 1), amount_value, 0, amount_value,
         case when amount_value = 0 then 'paid'::public.membership_fee_status else 'unpaid'::public.membership_fee_status end
  from public.members m where m.organization_id = organization_value and m.status = 'active'
  on conflict (member_id, contribution_month) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create function public.create_exceptional_contribution(admin_id uuid, contribution_label text, contribution_amount numeric, contribution_due_date date, selected_member_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; contribution_id uuid; target_count integer;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if length(btrim(coalesce(contribution_label, ''))) = 0 then raise exception 'Label is required'; end if;
  if contribution_amount is null or contribution_amount <= 0 then raise exception 'Contribution amount must be positive'; end if;
  if contribution_due_date is null then raise exception 'Due date is required'; end if;
  if coalesce(cardinality(selected_member_ids), 0) > 0 then
    select count(*) into target_count from public.members where id = any(selected_member_ids) and organization_id = organization_value and status = 'active';
    if target_count <> cardinality(selected_member_ids) then raise exception 'Member not found'; end if;
  end if;
  insert into public.exceptional_contributions (organization_id, label, amount, due_date, created_by) values (organization_value, btrim(contribution_label), contribution_amount, contribution_due_date, admin_id) returning id into contribution_id;
  insert into public.exceptional_contribution_dues (exceptional_contribution_id, member_id, amount_due, amount_paid, remaining_amount, status)
  select contribution_id, m.id, contribution_amount, 0, contribution_amount, 'unpaid'
  from public.members m where m.organization_id = organization_value and m.status = 'active' and (coalesce(cardinality(selected_member_ids), 0) = 0 or m.id = any(selected_member_ids));
  return contribution_id;
end;
$$;

create function public.record_contribution_payment(admin_id uuid, due_kind text, due_id uuid, payment_amount numeric, payment_date date, payment_reference_value text, payment_source_value text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; current_due record; payment_id uuid; source_value public.contribution_payment_source;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if payment_amount is null or payment_amount <= 0 then raise exception 'Payment amount must be positive'; end if;
  if payment_date is null then raise exception 'Payment date is required'; end if;
  if btrim(coalesce(payment_source_value, '')) not in ('manual', 'wave') then raise exception 'Invalid payment source'; end if;
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

create function public.create_disbursement(admin_id uuid, disbursement_label text, disbursement_amount numeric, disbursement_date date, disbursement_type_value text, target_member_id uuid, target_contribution_id uuid, disbursement_justification text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; result_id uuid; type_value public.disbursement_type;
begin
  select organization_id into organization_value from public.users where id=admin_id and role='admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if length(btrim(coalesce(disbursement_justification, ''))) = 0 then raise exception 'Justification is required'; end if;
  if disbursement_amount is null or disbursement_amount <= 0 then raise exception 'Disbursement amount must be positive'; end if;
  if btrim(coalesce(disbursement_type_value, '')) not in ('general_expense', 'member_aid', 'exceptional_contribution_payment') then raise exception 'Invalid disbursement type'; end if;
  type_value := btrim(disbursement_type_value)::public.disbursement_type;
  if target_member_id is not null and not exists(select 1 from public.members where id=target_member_id and organization_id=organization_value) then raise exception 'Member not found'; end if;
  if target_contribution_id is not null and not exists(select 1 from public.exceptional_contributions where id=target_contribution_id and organization_id=organization_value) then raise exception 'Contribution not found'; end if;
  if type_value='general_expense' and (target_member_id is not null or target_contribution_id is not null) then raise exception 'General expense cannot have a member or contribution'; end if;
  if type_value='member_aid' and target_member_id is null then raise exception 'Member is required for member aid'; end if;
  if type_value='member_aid' and target_contribution_id is not null then raise exception 'Member aid cannot have a contribution'; end if;
  if type_value='exceptional_contribution_payment' and target_contribution_id is null then raise exception 'Contribution is required for exceptional contribution payment'; end if;
  if type_value='exceptional_contribution_payment' and target_member_id is not null then raise exception 'Exceptional contribution payment cannot have a member'; end if;
  insert into public.disbursements (organization_id, member_id, label, amount, disbursed_on, created_by, disbursement_type, exceptional_contribution_id, justification) values (organization_value,target_member_id,btrim(disbursement_label),disbursement_amount,disbursement_date,admin_id,type_value,target_contribution_id,btrim(disbursement_justification)) returning id into result_id;
  return result_id;
end;
$$;

create function public.get_admin_finance(admin_id uuid, tab_value text, offset_value integer, limit_value integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare organization_value uuid; normalized_tab text:=lower(btrim(coalesce(tab_value,''))); total_count bigint; items jsonb; summary jsonb;
begin
  select organization_id into organization_value from public.users where id=admin_id and role='admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if normalized_tab not in ('monthly','exceptional','disbursements') then raise exception 'Invalid finance tab'; end if;
  if offset_value is null or offset_value < 0 then raise exception 'Offset must be non-negative'; end if;
  if limit_value is null or limit_value not between 1 and 100 then raise exception 'Limit must be between 1 and 100'; end if;
  if normalized_tab='monthly' then
    select count(*) into total_count from public.monthly_contribution_dues d join public.members m on m.id=d.member_id where m.organization_id=organization_value;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'memberId',member_id,'month',contribution_month,'dueDate',due_date,'amountDue',amount_due,'amountPaid',amount_paid,'amountRemaining',remaining_amount,'status',status) order by contribution_month desc, due_date desc, id desc), '[]'::jsonb) into items from (select d.* from public.monthly_contribution_dues d join public.members m on m.id=d.member_id where m.organization_id=organization_value order by d.contribution_month desc,d.due_date desc,d.id desc offset offset_value limit limit_value) p;
    select jsonb_build_object('totalExpected',count(*) filter (where m.status='active') * max(o.monthly_contribution_amount), 'totalPaid',coalesce(sum(d.amount_paid),0), 'totalRemaining',coalesce(sum(d.remaining_amount),0)) into summary from public.members m cross join public.organizations o left join public.monthly_contribution_dues d on d.member_id=m.id where m.organization_id=organization_value and o.id=organization_value;
  elsif normalized_tab='exceptional' then
    select count(*) into total_count from public.exceptional_contributions where organization_id=organization_value;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'amount',amount,'dueDate',due_date,'createdAt',created_at) order by due_date desc,id desc), '[]'::jsonb) into items from (select * from public.exceptional_contributions where organization_id=organization_value order by due_date desc,id desc offset offset_value limit limit_value) p;
    select jsonb_build_object('targetCount',count(d.id),'totalCollected',coalesce(sum(d.amount_paid),0),'totalRemaining',coalesce(sum(d.remaining_amount),0),'archivedCount',count(distinct c.id) filter (where c.due_date < current_date)) into summary from public.exceptional_contributions c left join public.exceptional_contribution_dues d on d.exceptional_contribution_id=c.id where c.organization_id=organization_value;
  else
    select count(*) into total_count from public.disbursements where organization_id=organization_value;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'memberId',member_id,'label',label,'amount',amount,'disbursedOn',disbursed_on,'type',disbursement_type,'exceptionalContributionId',exceptional_contribution_id,'justification',justification) order by disbursed_on desc,id desc), '[]'::jsonb) into items from (select * from public.disbursements where organization_id=organization_value order by disbursed_on desc,id desc offset offset_value limit limit_value) p;
    select jsonb_build_object('totalDisbursed',coalesce(sum(amount),0)) into summary from public.disbursements where organization_id=organization_value;
  end if;
  return jsonb_build_object('items',items,'metadata',jsonb_build_object('offset',offset_value,'limit',limit_value,'total',total_count),'summary',summary);
end;
$$;

alter table public.contribution_payments enable row level security;
revoke all on function public.enforce_contribution_payment_context() from public;
revoke all on function public.prevent_contribution_payment_mutation() from public;
revoke all on function public.enforce_disbursement_exceptional_organization() from public;
revoke all on function public.apply_legacy_disbursement_defaults() from public;
revoke all on function public.generate_monthly_contribution_dues(uuid, date) from public;
revoke all on function public.create_exceptional_contribution(uuid, text, numeric, date, uuid[]) from public;
revoke all on function public.record_contribution_payment(uuid, text, uuid, numeric, date, text, text) from public;
revoke all on function public.create_disbursement(uuid, text, numeric, date, text, uuid, uuid, text) from public;
revoke all on function public.get_admin_finance(uuid, text, integer, integer) from public;
grant execute on function public.generate_monthly_contribution_dues(uuid, date) to service_role;
grant execute on function public.create_exceptional_contribution(uuid, text, numeric, date, uuid[]) to service_role;
grant execute on function public.record_contribution_payment(uuid, text, uuid, numeric, date, text, text) to service_role;
grant execute on function public.create_disbursement(uuid, text, numeric, date, text, uuid, uuid, text) to service_role;
grant execute on function public.get_admin_finance(uuid, text, integer, integer) to service_role;
