-- Server-side payment intents. The provider request is not a confirmed payment.
create table public.jeko_payment_intents (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  monthly_due_id uuid not null references public.monthly_contribution_dues(id) on delete restrict,
  created_by uuid not null references public.users(id) on delete restrict,
  amount_xof bigint not null check (amount_xof > 0 and amount_xof <= 9999999999),
  store_id uuid not null,
  reference text not null unique,
  provider_request_id text unique,
  checkout_url text,
  provider_transaction_id text unique,
  status text not null default 'creating' check (status in ('creating', 'pending', 'confirmed', 'failed', 'needs_review')),
  contribution_payment_id uuid unique references public.contribution_payments(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status <> 'confirmed') or (provider_transaction_id is not null and contribution_payment_id is not null))
);
create index jeko_payment_intents_organization_created_idx on public.jeko_payment_intents (organization_id, created_at desc);
alter table public.jeko_payment_intents enable row level security;
revoke all on public.jeko_payment_intents from public, anon, authenticated;
grant select, insert, update on public.jeko_payment_intents to service_role;
