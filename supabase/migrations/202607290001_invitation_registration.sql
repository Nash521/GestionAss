create table public.organization_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code_hash bytea not null unique check (octet_length(code_hash) = 32),
  is_active boolean not null default true,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  check (usage_limit is null or usage_count <= usage_limit)
);

alter table public.organization_invitations enable row level security;

create function public.consume_registration_invitation(invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  consumed_organization_id uuid;
begin
  update public.organization_invitations
  set usage_count = usage_count + 1
  where id = invitation_id
    and is_active
    and (expires_at is null or expires_at > pg_catalog.now())
    and (usage_limit is null or usage_count < usage_limit)
  returning organization_id into consumed_organization_id;

  if consumed_organization_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'invitation is unavailable';
  end if;

  return consumed_organization_id;
end;
$$;

revoke all on table public.organization_invitations from public;
revoke all on function public.consume_registration_invitation(uuid) from public;
grant execute on function public.consume_registration_invitation(uuid) to service_role;
