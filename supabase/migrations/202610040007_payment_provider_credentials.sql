create table public.payment_provider_credentials (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('wave', 'orange_money', 'mtn_momo')),
  encrypted_credentials text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.users(id),
  primary key (organization_id, provider)
);

alter table public.payment_provider_credentials enable row level security;
revoke all on public.payment_provider_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.payment_provider_credentials to service_role;

create table public.provider_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  member_id uuid not null references public.members(id),
  monthly_due_id uuid not null references public.monthly_contribution_dues(id),
  provider text not null check (provider in ('wave', 'orange_money', 'mtn_momo')),
  amount numeric not null check (amount > 0),
  provider_reference text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create unique index provider_payment_attempts_reference_unique
  on public.provider_payment_attempts(provider, provider_reference)
  where provider_reference is not null;
create index provider_payment_attempts_due_idx on public.provider_payment_attempts(monthly_due_id, created_at desc);
alter table public.provider_payment_attempts enable row level security;
revoke all on public.provider_payment_attempts from public, anon, authenticated;
grant select, insert, update on public.provider_payment_attempts to service_role;
