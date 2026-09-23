alter table public.member_disciplinary_cases
  add column opened_by uuid references public.users(id) on delete restrict;

do $$
begin
  if exists (
    select 1
    from public.member_disciplinary_cases
    where status = 'open'
    group by member_id
    having count(*) > 1
  ) then
    raise exception 'Resolve duplicate open disciplinary cases before applying this migration';
  end if;
end;
$$;

create unique index member_disciplinary_cases_one_open_per_member_idx
  on public.member_disciplinary_cases (member_id)
  where status = 'open';

create or replace function public.open_member_disciplinary_case(
  admin_id uuid,
  target_member_id uuid,
  reason_value text,
  duration_days integer,
  observations_value text,
  evidence_value text,
  contribution_policy_value public.suspension_contribution_policy
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_value uuid;
  case_id uuid;
begin
  select organization_id
  into organization_value
  from public.users
  where id = admin_id
    and role = 'admin'
    and is_active;

  if organization_value is null then
    raise exception 'Unauthorized';
  end if;

  if length(btrim(coalesce(reason_value, ''))) not between 1 and 2000
    or duration_days not between 1 and 3650
    or contribution_policy_value is null
    or length(coalesce(observations_value, '')) > 5000
    or length(coalesce(evidence_value, '')) > 5000 then
    raise exception 'Invalid investigation';
  end if;

  perform 1
  from public.members
  where id = target_member_id
    and organization_id = organization_value
    and status = 'active'
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  if exists (
    select 1
    from public.member_disciplinary_cases
    where member_id = target_member_id
      and status = 'open'
  ) then
    raise exception 'An open disciplinary case already exists';
  end if;

  insert into public.member_disciplinary_cases (
    organization_id,
    member_id,
    opened_by,
    reason,
    planned_duration_days,
    observations,
    evidence,
    contribution_policy,
    status,
    sanction
  )
  values (
    organization_value,
    target_member_id,
    admin_id,
    btrim(reason_value),
    duration_days,
    nullif(btrim(coalesce(observations_value, '')), ''),
    nullif(btrim(coalesce(evidence_value, '')), ''),
    contribution_policy_value,
    'open',
    'none'
  )
  returning id into case_id;

  return case_id;
end;
$$;

create or replace function public.get_member_disciplinary_cases(
  admin_id uuid,
  target_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_value uuid;
  result_value jsonb;
begin
  select organization_id
  into organization_value
  from public.users
  where id = admin_id
    and role = 'admin'
    and is_active;

  if organization_value is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1
    from public.members
    where id = target_member_id
      and organization_id = organization_value
  ) then
    raise exception 'Member not found';
  end if;

  select jsonb_build_object(
    'cases',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'memberId', c.member_id,
          'reason', c.reason,
          'plannedDurationDays', c.planned_duration_days,
          'observations', c.observations,
          'evidence', c.evidence,
          'contributionPolicy', c.contribution_policy,
          'status', c.status,
          'sanction', c.sanction,
          'openedAt', c.opened_at,
          'openedBy', c.opened_by,
          'decidedAt', c.decided_at,
          'decidedBy', c.decided_by
        )
        order by c.opened_at desc, c.id desc
      ),
      '[]'::jsonb
    )
  )
  into result_value
  from public.member_disciplinary_cases c
  where c.organization_id = organization_value
    and c.member_id = target_member_id;

  return result_value;
end;
$$;

create or replace function public.decide_member_disciplinary_case(
  admin_id uuid,
  case_id uuid,
  outcome_value public.disciplinary_case_status,
  sanction_value public.disciplinary_sanction,
  observations_value text default null
)
returns public.member_status
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_value uuid;
  case_member_id uuid;
  target_user_id uuid;
  target_user_role public.account_role;
  old_status public.member_status;
  next_status public.member_status;
begin
  select organization_id
  into organization_value
  from public.users
  where id = admin_id
    and role = 'admin'
    and is_active;

  if organization_value is null then
    raise exception 'Unauthorized';
  end if;

  if outcome_value not in ('confirmed', 'dismissed')
    or sanction_value is null
    or (outcome_value = 'dismissed' and sanction_value <> 'none') then
    raise exception 'Invalid investigation decision';
  end if;

  if length(coalesce(observations_value, '')) > 5000 then
    raise exception 'Invalid investigation decision';
  end if;

  select c.member_id
  into case_member_id
  from public.member_disciplinary_cases c
  where c.id = case_id
    and c.organization_id = organization_value
    and c.status = 'open'
  for update;

  if case_member_id is null then
    raise exception 'Investigation not found';
  end if;

  select m.status, m.user_id, u.role
  into old_status, target_user_id, target_user_role
  from public.members m
  join public.users u on u.id = m.user_id
  where m.id = case_member_id
    and m.organization_id = organization_value
  for update of m, u;

  if old_status is null then
    raise exception 'Member not found';
  end if;

  if outcome_value = 'dismissed' or sanction_value in ('none', 'warning') then
    next_status := 'active';
  elsif sanction_value = 'removal' then
    next_status := 'removed';
  else
    next_status := 'suspended';
  end if;

  if target_user_role = 'admin' and next_status in ('suspended', 'removed') then
    perform u.id
    from public.users u
    where u.organization_id = organization_value
      and u.role = 'admin'
      and u.is_active
    order by u.id
    for update;

    if (select count(*) from public.users u where u.organization_id = organization_value and u.role = 'admin' and u.is_active) <= 1 then
      raise exception 'Cannot sanction the last active administrator';
    end if;
  end if;

  update public.member_disciplinary_cases
  set status = outcome_value,
      sanction = sanction_value,
      observations = coalesce(nullif(btrim(coalesce(observations_value, '')), ''), observations),
      decided_at = now(),
      decided_by = admin_id
  where id = case_id;

  update public.members
  set status = next_status
  where id = case_member_id;

  update public.users
  set is_active = (next_status = 'active')
  where id = target_user_id;

  if next_status <> old_status then
    insert into public.member_lifecycle_audit (
      organization_id,
      member_id,
      action,
      previous_status,
      next_status,
      actor_id
    )
    values (
      organization_value,
      case_member_id,
      case next_status
        when 'suspended' then 'suspend'
        when 'removed' then 'remove'
        else 'reactivate'
      end,
      old_status,
      next_status,
      admin_id
    );
  end if;

  return next_status;
end;
$$;

create or replace function public.generate_monthly_contribution_dues(admin_id uuid, month_value date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_value uuid;
  normalized_month date;
  due_day smallint;
  amount_value numeric;
  inserted_count integer;
begin
  select organization_id
  into organization_value
  from public.users
  where id = admin_id
    and role = 'admin'
    and is_active;

  if organization_value is null then
    raise exception 'Unauthorized';
  end if;

  if month_value is null then
    raise exception 'Contribution month is required';
  end if;

  normalized_month := date_trunc('month', month_value)::date;

  select monthly_contribution_due_day, monthly_contribution_amount
  into due_day, amount_value
  from public.organizations
  where id = organization_value
  for update;

  perform pg_advisory_xact_lock(hashtextextended(organization_value::text || normalized_month::text, 0));

  insert into public.monthly_contribution_dues (
    member_id,
    contribution_month,
    due_date,
    amount_due,
    amount_paid,
    remaining_amount,
    status
  )
  select
    m.id,
    normalized_month,
    normalized_month + (due_day - 1),
    amount_value,
    0,
    amount_value,
    case when amount_value = 0 then 'paid'::public.membership_fee_status else 'unpaid'::public.membership_fee_status end
  from public.members m
  where m.organization_id = organization_value
    and (
      m.status = 'active'
      or (
        m.status = 'suspended'
        and exists (
          select 1
          from public.member_disciplinary_cases c
          where c.member_id = m.id
            and c.status in ('open', 'confirmed')
            and c.sanction = 'suspension'
            and c.contribution_policy = 'continue'
        )
      )
    )
  on conflict (member_id, contribution_month) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.open_member_disciplinary_case(uuid, uuid, text, integer, text, text, public.suspension_contribution_policy) from public;
revoke all on function public.get_member_disciplinary_cases(uuid, uuid) from public;
revoke all on function public.decide_member_disciplinary_case(uuid, uuid, public.disciplinary_case_status, public.disciplinary_sanction, text) from public;
revoke all on function public.generate_monthly_contribution_dues(uuid, date) from public;

grant execute on function public.open_member_disciplinary_case(uuid, uuid, text, integer, text, text, public.suspension_contribution_policy) to service_role;
grant execute on function public.get_member_disciplinary_cases(uuid, uuid) to service_role;
grant execute on function public.decide_member_disciplinary_case(uuid, uuid, public.disciplinary_case_status, public.disciplinary_sanction, text) to service_role;
grant execute on function public.generate_monthly_contribution_dues(uuid, date) to service_role;
