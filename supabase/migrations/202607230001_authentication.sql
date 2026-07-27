create extension if not exists pgcrypto with schema extensions;

create type public.membership_request_status as enum ('pending', 'approved', 'rejected');
create type public.account_role as enum ('admin', 'member');
create type public.member_status as enum ('pending_membership', 'active', 'suspended', 'removed');
create type public.membership_fee_status as enum ('unpaid', 'partial', 'paid');

create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 1 and 160),
  membership_fee_amount numeric(12, 2) not null default 0 check (membership_fee_amount >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  role public.account_role not null default 'member',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.is_admin(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = candidate_id
      and role = 'admin'
      and is_active
  );
$$;

create function public.is_active_admin_for_organization(candidate_id uuid, candidate_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = candidate_id
      and organization_id = candidate_organization_id
      and role = 'admin'
      and is_active
  );
$$;

create table public.members (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null unique references auth.users(id) on delete restrict,
  member_number text not null unique check (length(btrim(member_number)) between 1 and 64),
  first_name text not null check (length(btrim(first_name)) between 1 and 100),
  last_name text not null check (length(btrim(last_name)) between 1 and 100),
  phone text not null unique check (phone ~ '^\+2250[157][0-9]{8}$'),
  joining_date date not null default current_date,
  status public.member_status not null default 'pending_membership',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.membership_fees (
  id uuid primary key default extensions.gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete cascade,
  amount_due numeric(12, 2) not null check (amount_due >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0 and amount_paid <= amount_due),
  remaining_amount numeric(12, 2) not null check (remaining_amount = amount_due - amount_paid),
  status public.membership_fee_status not null default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'unpaid' and amount_paid = 0 and remaining_amount = amount_due)
    or (status = 'partial' and amount_paid > 0 and amount_paid < amount_due)
    or (status = 'paid' and amount_paid = amount_due and remaining_amount = 0)
  )
);

create table public.membership_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null check (length(btrim(first_name)) between 1 and 100),
  last_name text not null check (length(btrim(last_name)) between 1 and 100),
  phone text not null unique check (phone ~ '^\+2250[157][0-9]{8}$'),
  status public.membership_request_status not null default 'pending',
  phone_verified_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id) on delete restrict,
  reviewed_at timestamptz,
  rejection_reason text,
  member_id uuid unique references public.members(id) on delete restrict,
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null and member_id is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null and member_id is not null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null and length(btrim(rejection_reason)) > 0 and member_id is null)
  )
);

create table public.auth_otps (
  id uuid primary key default extensions.gen_random_uuid(),
  phone text not null check (phone ~ '^\+2250[157][0-9]{8}$'),
  purpose text not null check (purpose in ('registration', 'password_reset')),
  code_hash bytea not null check (octet_length(code_hash) > 0),
  expires_at timestamptz not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  last_sent_at timestamptz not null default now(),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (phone, purpose)
);

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.members enable row level security;
alter table public.membership_fees enable row level security;
alter table public.membership_requests enable row level security;
alter table public.auth_otps enable row level security;

create policy "applicant reads own request"
on public.membership_requests
for select
to authenticated
using (user_id = auth.uid());

create policy "active admin manages requests"
on public.membership_requests
for all
to authenticated
using (public.is_active_admin_for_organization(auth.uid(), organization_id))
with check (public.is_active_admin_for_organization(auth.uid(), organization_id));

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
revoke all on function public.is_active_admin_for_organization(uuid, uuid) from public;
grant execute on function public.is_active_admin_for_organization(uuid, uuid) to authenticated, service_role;
