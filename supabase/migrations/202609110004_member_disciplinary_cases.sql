create type public.disciplinary_case_status as enum ('open', 'confirmed', 'dismissed', 'closed');
create type public.disciplinary_sanction as enum ('none', 'warning', 'suspension', 'removal');
create type public.suspension_contribution_policy as enum ('continue', 'stop');

create table public.member_disciplinary_cases (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  opened_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.users(id) on delete restrict,
  planned_duration_days integer check (planned_duration_days is null or planned_duration_days between 1 and 3650),
  observations text check (observations is null or length(observations) <= 5000),
  evidence text check (evidence is null or length(evidence) <= 5000),
  contribution_policy public.suspension_contribution_policy not null,
  status public.disciplinary_case_status not null default 'open',
  sanction public.disciplinary_sanction not null default 'none',
  constraint disciplinary_case_decision_complete check ((status = 'open' and decided_at is null and decided_by is null) or (status <> 'open' and decided_at is not null and decided_by is not null))
);
create index member_disciplinary_cases_member_idx on public.member_disciplinary_cases (member_id, opened_at desc);
alter table public.member_disciplinary_cases enable row level security;

create or replace function public.manage_admin_member(
  admin_id uuid, target_member_id uuid, action text,
  first_name_value text default null, last_name_value text default null, phone_value text default null
)
returns public.member_status language plpgsql security definer set search_path = public
as $$
declare organization_value uuid; current_status public.member_status; target_user uuid;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  select status, user_id into current_status, target_user from public.members where id = target_member_id and organization_id = organization_value for update;
  if current_status is null then raise exception 'Member not found'; end if;
  if action = 'update' then
    if length(btrim(coalesce(first_name_value, ''))) not between 1 and 100 or length(btrim(coalesce(last_name_value, ''))) not between 1 and 100 or phone_value !~ '^\+2250[157][0-9]{8}$' then raise exception 'Invalid member details'; end if;
    update public.members set first_name = btrim(first_name_value), last_name = btrim(last_name_value), phone = phone_value where id = target_member_id;
    return current_status;
  end if;
  if action in ('suspend', 'archive') then raise exception 'Disciplinary investigation required'; end if;
  if action <> 'reactivate' or current_status <> 'suspended' then raise exception 'Invalid member transition'; end if;
  update public.members set status = 'active' where id = target_member_id;
  update public.users set is_active = true where id = target_user;
  return 'active';
exception when unique_violation then raise exception 'Phone already used';
end;
$$;

revoke all on table public.member_disciplinary_cases from public;
revoke all on function public.manage_admin_member(uuid, uuid, text, text, text, text) from public;
grant execute on function public.manage_admin_member(uuid, uuid, text, text, text, text) to service_role;
