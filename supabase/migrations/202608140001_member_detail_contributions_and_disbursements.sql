create table public.monthly_contribution_dues (
  id uuid primary key default extensions.gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  contribution_month date not null check (contribution_month = date_trunc('month', contribution_month)::date),
  due_date date not null,
  amount_due numeric(12, 2) not null check (amount_due >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0 and amount_paid <= amount_due),
  remaining_amount numeric(12, 2) not null check (remaining_amount = amount_due - amount_paid),
  status public.membership_fee_status not null default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, contribution_month),
  check (
    (status = 'unpaid' and amount_paid = 0 and remaining_amount = amount_due)
    or (status = 'partial' and amount_paid > 0 and amount_paid < amount_due)
    or (status = 'paid' and amount_paid = amount_due and remaining_amount = 0)
  )
);

create table public.exceptional_contributions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  label text not null check (length(btrim(label)) > 0),
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date not null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exceptional_contribution_dues (
  id uuid primary key default extensions.gen_random_uuid(),
  exceptional_contribution_id uuid not null references public.exceptional_contributions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount_due numeric(12, 2) not null check (amount_due >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0 and amount_paid <= amount_due),
  remaining_amount numeric(12, 2) not null check (remaining_amount = amount_due - amount_paid),
  status public.membership_fee_status not null default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exceptional_contribution_id, member_id),
  check (
    (status = 'unpaid' and amount_paid = 0 and remaining_amount = amount_due)
    or (status = 'partial' and amount_paid > 0 and amount_paid < amount_due)
    or (status = 'paid' and amount_paid = amount_due and remaining_amount = 0)
  )
);

create table public.disbursements (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid references public.members(id) on delete restrict,
  label text not null check (length(btrim(label)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  disbursed_on date not null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index monthly_contribution_dues_member_month_idx on public.monthly_contribution_dues (member_id, contribution_month desc);
create index exceptional_contribution_dues_member_idx on public.exceptional_contribution_dues (member_id);
create index exceptional_contributions_organization_due_date_idx on public.exceptional_contributions (organization_id, due_date desc);
create index disbursements_member_date_idx on public.disbursements (member_id, disbursed_on desc);
create index disbursements_organization_member_date_idx on public.disbursements (organization_id, member_id, disbursed_on desc);

create function public.set_member_detail_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.enforce_disbursement_member_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.member_id is not null and not exists (
    select 1 from public.members
    where id = new.member_id and organization_id = new.organization_id
  ) then
    raise exception 'Disbursement member must belong to the organization';
  end if;
  return new;
end;
$$;

create trigger monthly_contribution_dues_set_updated_at
before update on public.monthly_contribution_dues
for each row execute function public.set_member_detail_updated_at();
create trigger exceptional_contributions_set_updated_at
before update on public.exceptional_contributions
for each row execute function public.set_member_detail_updated_at();
create trigger exceptional_contribution_dues_set_updated_at
before update on public.exceptional_contribution_dues
for each row execute function public.set_member_detail_updated_at();
create trigger disbursements_set_updated_at
before update on public.disbursements
for each row execute function public.set_member_detail_updated_at();
create trigger disbursements_enforce_member_organization
before insert or update of organization_id, member_id on public.disbursements
for each row execute function public.enforce_disbursement_member_organization();

alter table public.monthly_contribution_dues enable row level security;
alter table public.exceptional_contributions enable row level security;
alter table public.exceptional_contribution_dues enable row level security;
alter table public.disbursements enable row level security;

create policy "active admin reads member monthly dues"
on public.monthly_contribution_dues for select to authenticated
using (exists (
  select 1 from public.members m
  where m.id = member_id
    and public.is_active_admin_for_organization(auth.uid(), m.organization_id)
));
create policy "active admin reads organization exceptional contributions"
on public.exceptional_contributions for select to authenticated
using (public.is_active_admin_for_organization(auth.uid(), organization_id));
create policy "active admin reads member exceptional dues"
on public.exceptional_contribution_dues for select to authenticated
using (exists (
  select 1 from public.members m
  join public.exceptional_contributions c on c.id = exceptional_contribution_id
  where m.id = member_id
    and m.organization_id = c.organization_id
    and public.is_active_admin_for_organization(auth.uid(), m.organization_id)
));
create policy "active admin reads organization disbursements"
on public.disbursements for select to authenticated
using (public.is_active_admin_for_organization(auth.uid(), organization_id));

create function public.get_admin_member_detail(admin_id uuid, target_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_organization_id uuid;
  member_record record;
  membership_fee jsonb;
  monthly_dues jsonb;
  exceptional_dues jsonb;
  aid jsonb;
  summary jsonb;
  chart jsonb;
begin
  select organization_id into admin_organization_id
  from public.users
  where id = admin_id and role = 'admin' and is_active;

  select m.*, u.role into member_record
  from public.members m
  join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
  where m.id = target_member_id and m.organization_id = admin_organization_id;

  if admin_organization_id is null or member_record.id is null then
    raise exception 'Member not found';
  end if;

  select jsonb_build_object('amountDue', amount_due, 'amountPaid', amount_paid, 'remainingAmount', remaining_amount, 'status', status)
  into membership_fee from public.membership_fees where member_id = target_member_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'contributionMonth', contribution_month, 'dueDate', due_date, 'amountDue', amount_due,
    'amountPaid', amount_paid, 'remainingAmount', remaining_amount, 'status', status
  ) order by contribution_month desc), '[]'::jsonb)
  into monthly_dues from public.monthly_contribution_dues where member_id = target_member_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'label', c.label, 'dueDate', c.due_date, 'amountDue', d.amount_due, 'amountPaid', d.amount_paid,
    'remainingAmount', d.remaining_amount, 'status', d.status
  ) order by c.due_date desc, c.created_at desc), '[]'::jsonb)
  into exceptional_dues
  from public.exceptional_contribution_dues d
  join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
  where d.member_id = target_member_id;

  select jsonb_build_object(
    'count', count(*), 'totalReceived', coalesce(sum(amount), 0),
    'items', coalesce(jsonb_agg(jsonb_build_object('label', label, 'amount', amount, 'disbursedOn', disbursed_on) order by disbursed_on desc, created_at desc), '[]'::jsonb)
  ) into aid from public.disbursements where member_id = target_member_id;

  select jsonb_build_object(
    'totalContributed', coalesce((select amount_paid from public.membership_fees where member_id = target_member_id), 0) +
      coalesce((select sum(amount_paid) from public.monthly_contribution_dues where member_id = target_member_id), 0) +
      coalesce((select sum(amount_paid) from public.exceptional_contribution_dues where member_id = target_member_id), 0),
    'monthlyPaid', coalesce((select sum(amount_paid) from public.monthly_contribution_dues where member_id = target_member_id), 0),
    'monthlyRemaining', coalesce((select sum(remaining_amount) from public.monthly_contribution_dues where member_id = target_member_id), 0),
    'exceptionalPaid', coalesce((select sum(amount_paid) from public.exceptional_contribution_dues where member_id = target_member_id), 0),
    'exceptionalRemaining', coalesce((select sum(remaining_amount) from public.exceptional_contribution_dues where member_id = target_member_id), 0)
  ) into summary;

  select jsonb_agg(jsonb_build_object('month', month_start, 'paid', paid, 'unpaid', unpaid) order by month_start)
  into chart
  from (
    select months.month_start,
      coalesce(sum(d.amount_paid), 0) as paid,
      coalesce(sum(d.remaining_amount), 0) as unpaid
    from generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') as months(month_start)
    left join public.monthly_contribution_dues d on d.member_id = target_member_id and d.contribution_month = months.month_start::date
    group by months.month_start
  ) monthly_chart;

  return jsonb_build_object(
    'member', jsonb_build_object('id', member_record.id, 'memberNumber', member_record.member_number,
      'joiningDate', member_record.joining_date, 'role', member_record.role, 'status', member_record.status,
      'firstName', member_record.first_name, 'lastName', member_record.last_name, 'phone', member_record.phone),
    'membershipFee', membership_fee,
    'monthlyDues', monthly_dues,
    'exceptionalDues', exceptional_dues,
    'aid', aid,
    'summary', summary,
    'chart', coalesce(chart, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.set_member_detail_updated_at() from public;
revoke all on function public.enforce_disbursement_member_organization() from public;
revoke all on function public.get_admin_member_detail(uuid, uuid) from public;
grant execute on function public.get_admin_member_detail(uuid, uuid) to service_role;
