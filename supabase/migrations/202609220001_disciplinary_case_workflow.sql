alter table public.member_lifecycle_audit drop constraint member_lifecycle_audit_action_check;
alter table public.member_lifecycle_audit add constraint member_lifecycle_audit_action_check check (action in ('update', 'suspend', 'reactivate', 'remove'));

create or replace function public.open_member_disciplinary_case(
  admin_id uuid, target_member_id uuid, reason_value text, duration_days integer,
  observations_value text, evidence_value text, contribution_policy_value public.suspension_contribution_policy
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare organization_value uuid; target_user_id uuid; case_id uuid;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if length(btrim(coalesce(reason_value, ''))) not between 1 and 2000 or duration_days not between 1 and 3650 or contribution_policy_value is null then raise exception 'Invalid investigation'; end if;
  select user_id into target_user_id from public.members where id = target_member_id and organization_id = organization_value and status = 'active' for update;
  if target_user_id is null then raise exception 'Member not eligible for investigation'; end if;
  if exists (select 1 from public.users where id = target_user_id and role = 'admin' and is_active) and (select count(*) from public.users where organization_id = organization_value and role = 'admin' and is_active) <= 1 then raise exception 'Last active administrator'; end if;
  insert into public.member_disciplinary_cases(organization_id, member_id, reason, planned_duration_days, observations, evidence, contribution_policy, sanction)
  values (organization_value, target_member_id, btrim(reason_value), duration_days, nullif(btrim(coalesce(observations_value, '')), ''), nullif(btrim(coalesce(evidence_value, '')), ''), contribution_policy_value, 'suspension')
  returning id into case_id;
  update public.members set status = 'suspended' where id = target_member_id;
  update public.users set is_active = false where id = target_user_id;
  insert into public.member_lifecycle_audit(organization_id, member_id, action, previous_status, next_status, actor_id) values (organization_value, target_member_id, 'suspend', 'active', 'suspended', admin_id);
  return case_id;
end;
$$;

create or replace function public.decide_member_disciplinary_case(
  admin_id uuid, case_id uuid, outcome_value public.disciplinary_case_status,
  sanction_value public.disciplinary_sanction, observations_value text default null
)
returns public.member_status language plpgsql security definer set search_path = public
as $$
declare organization_value uuid; case_member_id uuid; target_user_id uuid; old_status public.member_status; next_status public.member_status;
begin
  select organization_id into organization_value from public.users where id = admin_id and role = 'admin' and is_active;
  if organization_value is null then raise exception 'Unauthorized'; end if;
  if outcome_value not in ('confirmed', 'dismissed') or sanction_value is null or (outcome_value = 'dismissed' and sanction_value <> 'none') then raise exception 'Invalid investigation decision'; end if;
  select c.member_id into case_member_id from public.member_disciplinary_cases c where c.id = case_id and c.organization_id = organization_value and c.status = 'open' for update;
  if case_member_id is null then raise exception 'Investigation not found'; end if;
  select status, user_id into old_status, target_user_id from public.members where id = case_member_id for update;
  if outcome_value = 'dismissed' or sanction_value in ('none', 'warning') then next_status := 'active'; elsif sanction_value = 'removal' then next_status := 'removed'; else next_status := 'suspended'; end if;
  update public.member_disciplinary_cases set status = outcome_value, sanction = sanction_value, observations = coalesce(nullif(btrim(coalesce(observations_value, '')), ''), observations), decided_at = now(), decided_by = admin_id where id = case_id;
  update public.members set status = next_status where id = case_member_id;
  update public.users set is_active = next_status = 'active' where id = target_user_id;
  if next_status <> old_status then insert into public.member_lifecycle_audit(organization_id, member_id, action, previous_status, next_status, actor_id) values (organization_value, case_member_id, case when next_status = 'removed' then 'remove' else 'reactivate' end, old_status, next_status, admin_id); end if;
  return next_status;
end;
$$;

revoke all on function public.open_member_disciplinary_case(uuid, uuid, text, integer, text, text, public.suspension_contribution_policy) from public;
revoke all on function public.decide_member_disciplinary_case(uuid, uuid, public.disciplinary_case_status, public.disciplinary_sanction, text) from public;
grant execute on function public.open_member_disciplinary_case(uuid, uuid, text, integer, text, text, public.suspension_contribution_policy) to service_role;
grant execute on function public.decide_member_disciplinary_case(uuid, uuid, public.disciplinary_case_status, public.disciplinary_sanction, text) to service_role;
