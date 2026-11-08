create table public.jeko_configurations (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  api_key_id text not null,
  store_id uuid not null,
  encrypted_api_key text not null,
  encrypted_webhook_secret text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.users(id)
);
alter table public.jeko_configurations enable row level security;
revoke all on public.jeko_configurations from public, anon, authenticated;
grant select, insert, update, delete on public.jeko_configurations to service_role;
